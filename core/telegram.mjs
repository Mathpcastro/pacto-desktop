// Native Bot API transport. Never retain upstream errors: fetch errors and API
// descriptions can include the credential-bearing request URL.
class TelegramError extends Error {
  constructor(message, code, retryAfter) {
    super(message);
    this.name = 'TelegramError';
    this.code = code;
    if (Number.isFinite(retryAfter) && retryAfter >= 0) this.retryAfter = retryAfter;
  }
}

export function splitText(text, max = 4000) {
  if (!Number.isInteger(max) || max < 1) throw new TelegramError('Limite de texto inválido.', 'EINVAL');
  const chunks = [];
  let chunk = '';
  // Counting UTF-16 units is conservative for Telegram's character limit,
  // while iteration by code point keeps surrogate pairs together.
  for (const character of String(text ?? '')) {
    if (chunk && chunk.length + character.length > max) { chunks.push(chunk); chunk = ''; }
    chunk += character;
  }
  if (chunk) chunks.push(chunk);
  return chunks;
}

export class TelegramClient {
  #token;
  #fetch;
  #base;
  #timeoutMs;

  constructor({ token, fetchImpl = globalThis.fetch, base = 'https://api.telegram.org', timeoutMs = 40000 }) {
    if (typeof token !== 'string' || !token.trim() || typeof fetchImpl !== 'function' || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
      throw new TelegramError('Configuração do Telegram inválida.', 'EINVAL');
    }
    this.#token = token.trim();
    this.#fetch = fetchImpl;
    this.#base = String(base).replace(/\/+$/, '');
    this.#timeoutMs = timeoutMs;
  }

  async call(method, params = {}, { signal } = {}) {
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(method)) throw new TelegramError('Método do Telegram inválido.', 'EINVAL');
    if (signal?.aborted) throw new TelegramError('Solicitação do Telegram cancelada.', 'ABORT_ERR');
    const controller = new AbortController();
    let timedOut = false;
    const cancel = () => controller.abort();
    let onAbort;
    const aborted = new Promise((_, reject) => {
      onAbort = () => reject(new TelegramError(timedOut ? 'Tempo de espera do Telegram esgotado.' : 'Solicitação do Telegram cancelada.', timedOut ? 'ETIMEDOUT' : 'ABORT_ERR'));
      controller.signal.addEventListener('abort', onAbort, { once: true });
    });
    signal?.addEventListener('abort', cancel, { once: true });
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, this.#timeoutMs);
    try {
      const request = async () => {
        const multipart = params instanceof FormData;
        const response = await this.#fetch(`${this.#base}/bot${this.#token}/${method}`, {
          method: 'POST',
          ...(multipart ? {} : { headers: { 'Content-Type': 'application/json' } }),
          body: multipart ? params : JSON.stringify(params),
          signal: controller.signal,
        });
        let body;
        try { body = await response.json(); }
        catch { throw new TelegramError('Resposta inválida do Telegram.', 'ETELEGRAM_RESPONSE'); }
        if (!response.ok || !body?.ok) {
          const apiCode = Number.isInteger(body?.error_code) ? body.error_code : null;
          const code = apiCode || (Number.isInteger(response.status) ? response.status : 'ETELEGRAM_RESPONSE');
          const retryAfter = code === 429 && typeof body?.parameters?.retry_after === 'number' ? body.parameters.retry_after : undefined;
          throw new TelegramError(`Solicitação recusada pelo Telegram (${code}).`, code, retryAfter);
        }
        if (!Object.hasOwn(body, 'result')) throw new TelegramError('Resposta inválida do Telegram.', 'ETELEGRAM_RESPONSE');
        return body.result;
      };
      // The race also bounds transports that fail to observe AbortSignal.
      return await Promise.race([request(), aborted]);
    } catch (error) {
      if (error instanceof TelegramError) throw error;
      throw new TelegramError('Falha de conexão com o Telegram.', 'ETELEGRAM_NETWORK');
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener('abort', cancel);
      controller.signal.removeEventListener('abort', onAbort);
    }
  }

  getMe() { return this.call('getMe'); }
  getWebhookInfo() { return this.call('getWebhookInfo'); }
  getUpdates(offset = 0, { signal, timeout = 25 } = {}) {
    return this.call('getUpdates', { offset, timeout, allowed_updates: ['message', 'callback_query'] }, { signal });
  }
  sendMessage(chatId, text, extra = {}) { return this.call('sendMessage', { ...extra, chat_id: chatId, text }); }
  answerCallbackQuery(id, text = '') { return this.call('answerCallbackQuery', { callback_query_id: id, text }); }
  editMessageReplyMarkup(chatId, messageId, replyMarkup = { inline_keyboard: [] }) {
    return this.call('editMessageReplyMarkup', { chat_id: chatId, message_id: messageId, reply_markup: replyMarkup });
  }

  async sendText(chatId, text, extra = {}) {
    const chunks = splitText(text), messages = [];
    const { reply_markup, ...options } = extra;
    for (let i = 0; i < chunks.length; i++) {
      messages.push(await this.sendMessage(chatId, chunks[i], { ...options, ...(i === chunks.length - 1 && reply_markup ? { reply_markup } : {}) }));
    }
    return messages;
  }

  async sendPhotos(chatId, photos, { caption = '' } = {}) {
    if (!Array.isArray(photos) || photos.some(photo => !photo || typeof photo.name !== 'string' || !photo.name || !Buffer.isBuffer(photo.bytes) || !photo.bytes.length)) {
      throw new TelegramError('Foto inválida para envio ao Telegram.', 'EINVAL');
    }
    if (!photos.length) return [];
    caption = String(caption);
    // Long captions are sent in full as plain text, after all photos. A short
    // caption appears only on the first photo of the first album.
    const longCaption = caption.length > 1024;
    const messages = [];
    for (let start = 0; start < photos.length; start += 10) {
      const group = photos.slice(start, start + 10), form = new FormData();
      form.set('chat_id', String(chatId));
      const firstCaption = start === 0 && !longCaption ? caption : '';
      if (group.length === 1) {
        form.set('photo', new Blob([group[0].bytes]), group[0].name);
        if (firstCaption) form.set('caption', firstCaption);
        messages.push(await this.call('sendPhoto', form));
      } else {
        const media = group.map((photo, index) => {
          const key = `photo${index}`;
          form.set(key, new Blob([photo.bytes]), photo.name);
          return { type: 'photo', media: `attach://${key}`, ...(index === 0 && firstCaption ? { caption: firstCaption } : {}) };
        });
        form.set('media', JSON.stringify(media));
        messages.push(...await this.call('sendMediaGroup', form));
      }
    }
    if (longCaption) messages.push(...await this.sendText(chatId, caption));
    return messages;
  }
}

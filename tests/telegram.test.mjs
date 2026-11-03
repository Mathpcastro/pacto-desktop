import test from 'node:test';
import assert from 'node:assert/strict';

const module = () => import('../core/telegram.mjs');
const token = '123456:super-secret-test-token';
const ok = result => ({ ok: true, status: 200, json: async () => ({ ok: true, result }) });
const photos = n => Array.from({ length: n }, (_, i) => ({ name: `${i}.png`, bytes: Buffer.from([i, 1, 2]) }));

test('Telegram JSON methods return results and constrain polling updates', async () => {
  const { TelegramClient } = await module();
  const requests = [];
  const client = new TelegramClient({ token, fetchImpl: async (url, options) => { requests.push({ url, ...options }); return ok({ id: 7 }); } });
  assert.deepEqual(await client.getMe(), { id: 7 });
  await client.getWebhookInfo();
  await client.getUpdates(41, { timeout: 12 });
  await client.sendMessage(9, 'Olá', { reply_markup: { inline_keyboard: [] } });
  await client.answerCallbackQuery('callback');
  await client.editMessageReplyMarkup(9, 11);
  assert.deepEqual(requests.map(r => r.url.split('/').at(-1)), ['getMe', 'getWebhookInfo', 'getUpdates', 'sendMessage', 'answerCallbackQuery', 'editMessageReplyMarkup']);
  assert.ok(requests.every(r => r.method === 'POST' && r.headers['Content-Type'] === 'application/json'));
  assert.deepEqual(JSON.parse(requests[2].body), { offset: 41, timeout: 12, allowed_updates: ['message', 'callback_query'] });
  assert.deepEqual(JSON.parse(requests[3].body), { chat_id: 9, text: 'Olá', reply_markup: { inline_keyboard: [] } });
  assert.deepEqual(JSON.parse(requests[4].body), { callback_query_id: 'callback', text: '' });
  assert.deepEqual(JSON.parse(requests[5].body), { chat_id: 9, message_id: 11, reply_markup: { inline_keyboard: [] } });
});

test('splitText preserves every character and complete surrogate pairs', async () => {
  const { splitText, TelegramClient } = await module();
  const text = `${'a'.repeat(3999)}😀\n  conteúdo ${'🎉'.repeat(2100)} fim\n`;
  const chunks = splitText(text);
  assert.equal(chunks.join(''), text);
  assert.ok(chunks.every(c => c.length <= 4000 && !/[\uD800-\uDBFF]$/.test(c) && !/^[\uDC00-\uDFFF]/.test(c)));
  assert.deepEqual(splitText(''), []);
  assert.throws(() => splitText('a', 0), /limite/i);
  const sent = [];
  const client = new TelegramClient({ token, fetchImpl: async (_, o) => { sent.push(JSON.parse(o.body)); return ok({ message_id: sent.length }); } });
  const result = await client.sendText(7, text, { reply_markup: { inline_keyboard: [] } });
  assert.equal(sent.map(r => r.text).join(''), text);
  assert.equal(result.length, chunks.length);
  assert.ok(sent.slice(0, -1).every(r => !r.reply_markup));
  assert.deepEqual(sent.at(-1).reply_markup, { inline_keyboard: [] });
});

for (const count of [1, 11, 12]) test(`sendPhotos uploads ${count} photos in valid groups and captions only first photo`, async () => {
  const { TelegramClient } = await module();
  const requests = [];
  let id = 0;
  const client = new TelegramClient({ token, fetchImpl: async (url, o) => {
    requests.push({ url, ...o });
    const count = url.endsWith('/sendPhoto') ? 1 : JSON.parse(o.body.get('media')).length;
    const results = Array.from({ length: count }, () => ({ message_id: ++id }));
    return ok(count === 1 ? results[0] : results);
  } });
  const result = await client.sendPhotos(77, photos(count), { caption: 'Legenda' });
  assert.equal(result.length, count);
  assert.deepEqual(result.map(r => r.message_id), Array.from({ length: count }, (_, i) => i + 1));
  assert.deepEqual(requests.map(r => r.url.split('/').at(-1)), count === 1 ? ['sendPhoto'] : ['sendMediaGroup', count === 11 ? 'sendPhoto' : 'sendMediaGroup']);
  const uploaded = [];
  const captions = [];
  for (const request of requests) {
    assert.ok(request.body instanceof FormData);
    assert.equal(request.headers?.['Content-Type'], undefined);
    assert.equal(request.body.get('chat_id'), '77');
    if (request.url.endsWith('/sendPhoto')) {
      uploaded.push(request.body.get('photo'));
      if (request.body.get('caption')) captions.push(request.body.get('caption'));
    } else {
      const media = JSON.parse(request.body.get('media'));
      assert.ok(media.length >= 2 && media.length <= 10);
      for (const item of media) { assert.equal(item.type, 'photo'); uploaded.push(request.body.get(item.media.slice('attach://'.length))); if (item.caption) captions.push(item.caption); }
    }
  }
  assert.deepEqual(captions, ['Legenda']);
  assert.deepEqual(uploaded.map(p => p.name), photos(count).map(p => p.name));
  assert.deepEqual(Buffer.from(await uploaded.at(-1).arrayBuffer()), photos(count).at(-1).bytes);
});

test('long photo captions are preserved as full text after uploads', async () => {
  const { TelegramClient } = await module();
  const caption = 'legenda 😀\n'.repeat(700), sent = [];
  const client = new TelegramClient({ token, fetchImpl: async (url, o) => { sent.push({ url, body: o.body }); return ok({ message_id: sent.length }); } });
  const result = await client.sendPhotos(77, photos(1), { caption });
  assert.equal(sent[0].body.get('caption'), null);
  assert.equal(sent.slice(1).map(r => JSON.parse(r.body).text).join(''), caption);
  assert.equal(result.length, sent.length);
});

test('API, HTTP, invalid JSON and transport errors never expose tokens or retry writes', async () => {
  const { TelegramClient } = await module();
  for (const fetchImpl of [
    async () => ({ status: 429, ok: false, json: async () => ({ ok: false, error_code: 429, description: `https://api.telegram.org/bot${token}/sendMessage`, parameters: { retry_after: 8 } }) }),
    async () => ({ status: 500, ok: false, json: async () => ({ ok: true, result: `https://api.telegram.org/bot${token}` }) }),
    async () => ({ status: 200, ok: true, json: async () => { throw Error(token); } }),
    async () => { throw Error(`fetch failed https://api.telegram.org/bot${token}`); },
  ]) {
    let calls = 0;
    const client = new TelegramClient({ token, fetchImpl: (...args) => { calls++; return fetchImpl(...args); } });
    await assert.rejects(client.sendMessage(1, 'oi'), e => {
      assert.equal(`${e.stack} ${JSON.stringify(e)}`.includes(token), false);
      assert.ok(e.code);
      if (e.code === 429) assert.equal(e.retryAfter, 8);
      return true;
    });
    assert.equal(calls, 1);
  }
});

test('request timeout and external cancellation finish even with uncooperative transport', async () => {
  const { TelegramClient } = await module();
  const client = new TelegramClient({ token, timeoutMs: 10, fetchImpl: () => new Promise(() => {}) });
  await assert.rejects(client.getMe(), e => e.code === 'ETIMEDOUT');
  const controller = new AbortController();
  const pending = new TelegramClient({ token, fetchImpl: () => new Promise(() => {}) }).getUpdates(0, { signal: controller.signal });
  controller.abort(Error(token));
  await assert.rejects(pending, e => e.code === 'ABORT_ERR' && !String(e.stack).includes(token));
  const already = new AbortController(); already.abort();
  let calls = 0;
  await assert.rejects(new TelegramClient({ token, fetchImpl: () => { calls++; } }).call('getMe', {}, { signal: already.signal }), e => e.code === 'ABORT_ERR');
  assert.equal(calls, 0);
});

test('invalid photo batch is rejected before sending any partial batch', async () => {
  const { TelegramClient } = await module();
  let calls = 0;
  const client = new TelegramClient({ token, fetchImpl: () => { calls++; } });
  await assert.rejects(client.sendPhotos(1, [...photos(10), { name: 'broken.png', bytes: null }]), /foto/i);
  assert.deepEqual(await client.sendPhotos(1, []), []);
  assert.equal(calls, 0);
});

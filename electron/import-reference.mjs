import { appendFile, readFile, stat } from 'node:fs/promises';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { IMAGE_LIMIT, imageKind } from '../core/personas.mjs';
import { validateReference } from '../core/store.mjs';

const READ_ERROR = 'Não foi possível ler a imagem.';

export function referenceImportOptions({ purpose } = {}) {
  return purpose === 'personaAnchor'
    ? { title: 'Escolher foto-âncora', maxBytes: IMAGE_LIMIT, sizeError: 'Use uma foto de até 15 MB.' }
    : { title: 'Importar referência visual', maxBytes: 20 * 1024 * 1024, sizeError: 'Use uma referência de até 20 MB.' };
}

export function createImportLog(file) {
  let queue = Promise.resolve();
  return (event, data) => {
    queue = queue.then(async () => {
      const line = JSON.stringify({ t: new Date().toISOString(), event, ...data });
      await appendFile(file, line + '\n', { mode: 0o600 });
    }).catch(() => {});
    return queue;
  };
}

export async function normalizeImportedPath(raw) {
  if (typeof raw !== 'string' || !raw) throw new Error(READ_ERROR);
  const toPath = value => /^file:\/\//i.test(value) ? fileURLToPath(value) : value;
  try {
    const original = toPath(raw);
    const trimmed = raw.trim();
    if (!trimmed || trimmed === raw) return original;
    try {
      await stat(original);
    } catch (error) {
      if (error.code === 'ENOENT' || /^ENOTDIR$/.test(error.code)) {
        const fallback = toPath(trimmed);
        if (await stat(fallback).then(() => true, () => false)) return fallback;
      }
    }
    return original;
  } catch (cause) {
    throw new Error(READ_ERROR, { cause });
  }
}

async function decodeValidatedBytes(bytes, name, maxBytes, sizeError, decode) {
  const buffer = Buffer.isBuffer(bytes)
    ? bytes
    : ArrayBuffer.isView(bytes)
      ? Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
      : null;
  if (!buffer || !buffer.length) throw new Error(READ_ERROR);
  if (buffer.length > maxBytes) throw new Error(sizeError);
  try {
    const kind = imageKind(buffer);
    const reference = validateReference({
      name: basename(String(name || `imagem.${kind}`)) || `imagem.${kind}`,
      dataUrl: `data:image/${kind};base64,${buffer.toString('base64')}`,
    });
    if (kind !== 'png' && decode) await decode(buffer, kind);
    return reference;
  } catch (cause) {
    throw new Error(READ_ERROR, { cause });
  }
}

export async function readImportedBytes(bytes, name, args, decode, log = () => {}) {
  void log('read-start', { rawPath: null, dropName: typeof name === 'string' ? name : null });
  try {
    const { maxBytes, sizeError } = referenceImportOptions(args);
    const reference = await decodeValidatedBytes(bytes, name, maxBytes, sizeError, decode);
    void log('read-ok', { normalizedPath: null, name: reference.name, dataUrlLength: reference.dataUrl.length });
    return reference;
  } catch (error) {
    void log('read-error', { rawPath: null, message: error.message });
    throw error;
  }
}

export async function readImportedImage(rawPath, args, decode, log = () => {}) {
  void log('read-start', { rawPath: rawPath ?? null });
  try {
    const file = await normalizeImportedPath(rawPath);
    const { maxBytes, sizeError } = referenceImportOptions(args);
    const info = await stat(file).catch(cause => { throw new Error(READ_ERROR, { cause }); });
    if (!info.isFile()) throw new Error(READ_ERROR);
    if (info.size > maxBytes) throw new Error(sizeError);

    const bytes = await readFile(file).catch(cause => { throw new Error(READ_ERROR, { cause }); });
    const reference = await decodeValidatedBytes(bytes, basename(file), maxBytes, sizeError, decode);
    void log('read-ok', { normalizedPath: file, name: reference.name, dataUrlLength: reference.dataUrl.length });
    return reference;
  } catch (error) {
    void log('read-error', { rawPath: rawPath ?? null, message: error.message });
    throw error;
  }
}

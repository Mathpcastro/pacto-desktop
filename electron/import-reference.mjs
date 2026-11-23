import { readFile, stat } from 'node:fs/promises';
import { basename } from 'node:path';
import { IMAGE_LIMIT, imageKind } from '../core/personas.mjs';
import { validateReference } from '../core/store.mjs';

const READ_ERROR = 'Não foi possível ler a imagem.';

export function referenceImportOptions({ purpose } = {}) {
  return purpose === 'personaAnchor'
    ? { title: 'Escolher foto-âncora', maxBytes: IMAGE_LIMIT, sizeError: 'Use uma foto de até 15 MB.' }
    : { title: 'Importar referência visual', maxBytes: 20 * 1024 * 1024, sizeError: 'Use uma referência de até 20 MB.' };
}

export async function readImportedImage(file, args, decode) {
  const { maxBytes, sizeError } = referenceImportOptions(args);
  const info = await stat(file).catch(cause => { throw new Error(READ_ERROR, { cause }); });
  if (!info.isFile()) throw new Error(READ_ERROR);
  if (info.size > maxBytes) throw new Error(sizeError);

  const bytes = await readFile(file).catch(cause => { throw new Error(READ_ERROR, { cause }); });
  if (bytes.length > maxBytes) throw new Error(sizeError);
  try {
    const kind = imageKind(bytes);
    const reference = validateReference({
      name: basename(file),
      dataUrl: `data:image/${kind};base64,${bytes.toString('base64')}`,
    });
    if (kind !== 'png' && decode) await decode(bytes, kind);
    return reference;
  } catch (cause) {
    throw new Error(READ_ERROR, { cause });
  }
}

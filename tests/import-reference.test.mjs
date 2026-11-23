import test from 'node:test';
import assert from 'node:assert/strict';
import { access, copyFile, mkdtemp, readFile, rm, truncate, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Runtime } from '../core/runtime.mjs';
import { readImportedImage, referenceImportOptions } from '../electron/import-reference.mjs';

const fixture = '/workspace/ugc-prompts/resultados/camila/01-ancora.png';
const anchor = { purpose: 'personaAnchor' };

test('lê a foto-âncora real do bind mount e de um diretório temporário', async t => {
  await assert.doesNotReject(access(fixture), `Foto-âncora de regressão ausente ou inacessível: ${fixture}`);
  const temp = await mkdtemp(join('/tmp', 'carrossell-ancora-'));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const copy = join(temp, '01-ancora.png');
  await copyFile(fixture, copy);
  const original = await readFile(fixture);
  assert.equal(original.readUInt32BE(16), 1080);
  assert.equal(original.readUInt32BE(20), 1350);

  for (const file of [fixture, copy]) {
    const { name, dataUrl } = await readImportedImage(file, anchor);
    assert.equal(name, '01-ancora.png');
    assert.match(dataUrl, /^data:image\/png;base64,/);
    assert.deepEqual(Buffer.from(dataUrl.split(',')[1], 'base64'), original);
  }
});

test('rejeita caminho ausente, diretório e imagem inválida com erro em português', async t => {
  const temp = await mkdtemp(join(tmpdir(), 'carrossell-import-'));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const invalid = join(temp, 'invalida.png');
  await writeFile(invalid, 'sem imagem');
  for (const file of [undefined, join(temp, 'inexistente.png'), temp, invalid]) {
    await assert.rejects(readImportedImage(file, anchor), { message: 'Não foi possível ler a imagem.' });
  }
  await truncate(invalid, 15 * 1024 * 1024 + 1);
  await assert.rejects(readImportedImage(invalid, anchor), { message: 'Use uma foto de até 15 MB.' });
  await assert.rejects(readImportedImage(invalid), { message: 'Não foi possível ler a imagem.' });
});

test('o runtime encaminha o propósito e só o seletor de âncora troca de título', async () => {
  const runtime = new Runtime({
    store: {}, codex: {}, knowledge: {},
    dialogs: { importReference: args => referenceImportOptions(args).title },
  });
  assert.equal(await runtime.request('importReference', anchor), 'Escolher foto-âncora');
  assert.equal(await runtime.request('importReference'), 'Importar referência visual');
});

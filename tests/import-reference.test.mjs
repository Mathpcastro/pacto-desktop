import test from 'node:test';
import assert from 'node:assert/strict';
import { access, copyFile, mkdtemp, readFile, rm, truncate, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Runtime } from '../core/runtime.mjs';
import { createImportLog, normalizeImportedPath, readImportedBytes, readImportedImage, referenceImportOptions } from '../electron/import-reference.mjs';
import { canCloseFromBackdrop, isBackdropEvent, shouldBlockPersonaClose } from '../src/components/dialog-close.mjs';

const fixture = fileURLToPath(new URL('./fixtures/01-ancora.png', import.meta.url));
const anchor = { purpose: 'personaAnchor' };

test('lê a foto-âncora real por caminho, URI e cópia fora do diretório pessoal', async t => {
  await assert.doesNotReject(access(fixture), `Foto-âncora de regressão ausente ou inacessível: ${fixture}`);
  const temp = await mkdtemp(join('/tmp', 'carrossell-ancora-'));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const copy = join(temp, '01-âncora cópia.png');
  await copyFile(fixture, copy);
  const original = await readFile(fixture);
  assert.equal(original.readUInt32BE(16), 1080);
  assert.equal(original.readUInt32BE(20), 1350);

  for (const [file, path, name] of [
    [fixture, fixture, '01-ancora.png'],
    [pathToFileURL(fixture).href, fixture, '01-ancora.png'],
    [copy, copy, '01-âncora cópia.png'],
    [pathToFileURL(copy).href, copy, '01-âncora cópia.png'],
    [`  ${pathToFileURL(copy).href}\n`, copy, '01-âncora cópia.png'],
  ]) {
    assert.equal(await normalizeImportedPath(file), path);
    const result = await readImportedImage(file, anchor);
    assert.equal(result.name, name);
    assert.match(result.dataUrl, /^data:image\/png;base64,/);
    assert.deepEqual(Buffer.from(result.dataUrl.split(',')[1], 'base64'), original);
  }
});

test('só remove espaços e quebras de linha de um caminho se houver uma alternativa real', async t => {
  const temp = await mkdtemp(join(tmpdir(), 'carrossell-caminho-'));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const path = join(temp, 'ancora.png');
  const spaced = `${path} `;
  await copyFile(fixture, path);
  assert.equal(await normalizeImportedPath(` ${path}\n`), path);
  const missing = `${join(temp, 'inexistente.png')} \n`;
  assert.equal(await normalizeImportedPath(missing), missing);
  await copyFile(fixture, spaced);
  assert.equal(await normalizeImportedPath(spaced), spaced);
  assert.equal(await normalizeImportedPath(pathToFileURL(spaced).href), spaced);
});

test('registra a leitura em JSONL sem incluir os dados da imagem', async t => {
  const temp = await mkdtemp(join(tmpdir(), 'carrossell-import-log-'));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const logPath = join(temp, 'import-reference.log');
  const log = createImportLog(logPath);
  const rawPath = pathToFileURL(fixture).href;
  const { name, dataUrl } = await readImportedImage(rawPath, anchor, undefined, log);
  await assert.rejects(readImportedImage('', anchor, undefined, log), { message: 'Não foi possível ler a imagem.' });
  await log('test-end');
  const contents = await readFile(logPath, 'utf8');
  const entries = contents.trim().split('\n').map(line => {
    const { t: timestamp, ...entry } = JSON.parse(line);
    assert.ok(Number.isFinite(Date.parse(timestamp)));
    return entry;
  });
  assert.deepEqual(entries, [
    { event: 'read-start', rawPath },
    { event: 'read-ok', normalizedPath: fixture, name, dataUrlLength: dataUrl.length },
    { event: 'read-start', rawPath: '' },
    { event: 'read-error', rawPath: '', message: 'Não foi possível ler a imagem.' },
    { event: 'test-end' },
  ]);
});

test('o backdrop exige que o clique comece e termine fora do retângulo do diálogo', () => {
  const dialog = { getBoundingClientRect: () => ({ left: 10, right: 110, top: 20, bottom: 120 }) };
  const outside = { target: dialog, clientX: 5, clientY: 15 };
  const inside = { target: dialog, clientX: 40, clientY: 60 };
  assert.equal(isBackdropEvent(outside, dialog), true);
  assert.equal(isBackdropEvent(inside, dialog), false);
  assert.equal(isBackdropEvent({ ...outside, target: {} }, dialog), false);
  assert.equal(canCloseFromBackdrop(false, true), false);
  assert.equal(canCloseFromBackdrop(true, false), false);
  assert.equal(canCloseFromBackdrop(true, true), true);
});

test('a escolha bloqueia o fechamento e os 800 ms seguintes só bloqueiam Escape e backdrop', () => {
  const state = { picking: false, busy: false, ignoreCloseUntil: 1800, now: 1000 };
  for (const reason of ['onCancel', 'backdrop-click', 'header-close-button', 'cancel-button']) {
    assert.equal(shouldBlockPersonaClose({ ...state, reason, picking: true }), true);
    assert.equal(shouldBlockPersonaClose({ ...state, reason, busy: true }), true);
    assert.equal(shouldBlockPersonaClose({ ...state, reason, now: 1800 }), false);
  }
  for (const reason of ['onCancel', 'backdrop-click']) {
    assert.equal(shouldBlockPersonaClose({ ...state, reason, now: 1799 }), true);
  }
  for (const reason of ['header-close-button', 'cancel-button']) {
    assert.equal(shouldBlockPersonaClose({ ...state, reason }), false);
  }
});

test('rejeita caminho ausente, diretório e imagem inválida com erro em português', async t => {
  const temp = await mkdtemp(join(tmpdir(), 'carrossell-import-'));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const invalid = join(temp, 'invalida.png');
  await writeFile(invalid, 'sem imagem');
  await assert.rejects(normalizeImportedPath(''), { message: 'Não foi possível ler a imagem.' });
  for (const file of ['', undefined, join(temp, 'inexistente.png'), temp, invalid]) {
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

test('lê bytes arrastados da foto-âncora e rejeita arquivo inválido ou acima do limite', async () => {
  const original = await readFile(fixture);
  const events = [];
  const log = (event, data) => events.push({ event, ...data });
  const result = await readImportedBytes(original, '01-ancora.png', anchor, undefined, log);
  assert.equal(result.name, '01-ancora.png');
  assert.deepEqual(Buffer.from(result.dataUrl.split(',')[1], 'base64'), original);
  assert.equal(events.at(-1).event, 'read-ok');

  await assert.rejects(readImportedBytes(Buffer.from('invalido'), 'texto.txt', anchor, undefined, log), {
    message: 'Não foi possível ler a imagem.',
  });
  await assert.rejects(readImportedBytes(Buffer.alloc(15 * 1024 * 1024 + 1), 'grande.png', anchor, undefined, log), {
    message: 'Use uma foto de até 15 MB.',
  });
  assert.equal(events.at(-1).event, 'read-error');
});

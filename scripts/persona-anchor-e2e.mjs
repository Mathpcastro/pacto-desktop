import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { homedir, tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { crc32 } from 'node:zlib';
import { _electron, expect } from '@playwright/test';

const root = fileURLToPath(new URL('../', import.meta.url));
const fixture = '/workspace/ugc-prompts/resultados/camila/01-ancora.png';
const original = await readFile(fixture);
const userData = await mkdtemp(join(tmpdir(), 'carrossell-persona-e2e-'));
const executablePath = process.env.PACTO_E2E_EXECUTABLE ? resolve(process.env.PACTO_E2E_EXECUTABLE) : undefined;
const env = {
  ...process.env,
  PACTO_USER_DATA: userData,
  PACTO_AUTOPILOT_NO_TASKS: '1',
  PACTO_UPDATE_URL: 'http://127.0.0.1:9/',
  PACTO_NOTICES_URL: 'http://127.0.0.1:9/notices.json',
};
delete env.ELECTRON_RUN_AS_NODE;
delete env.PACTO_DEV_URL;

const logPath = join(userData, 'import-reference.log');
const readLog = async () => (await readFile(logPath, 'utf8')).trim().split('\n').map(line => JSON.parse(line));
const previewPrefix = 'data:image/png;base64,';

async function dismissLicense(page) {
  const later = page.getByRole('dialog', { name: 'Ative sua licença' }).getByRole('button', { name: 'Agora não' });
  const appeared = await later.waitFor({ state: 'visible', timeout: 4000 }).then(() => true, () => false);
  if (appeared) await later.click();
}

let homeTemp;
let electronApp;
try {
  homeTemp = await mkdtemp(join(homedir(), 'carrossell-persona-e2e-'));
  const homeCopy = join(homeTemp, '01-ancora.png');
  // Acrescenta metadados à cópia para detectar a troca do src com os mesmos pixels.
  const textChunk = Buffer.from('tEXtComment\0Cópia do teste de importação', 'latin1');
  const chunk = Buffer.alloc(textChunk.length + 8);
  chunk.writeUInt32BE(textChunk.length - 4);
  textChunk.copy(chunk, 4);
  chunk.writeUInt32BE(crc32(textChunk), chunk.length - 4);
  const copy = Buffer.concat([original.subarray(0, -12), chunk, original.subarray(-12)]);
  await writeFile(homeCopy, copy);

  electronApp = await _electron.launch({
    executablePath, args: executablePath ? ['--no-sandbox'] : ['.', '--no-sandbox'], cwd: root, env,
  });
  const page = await electronApp.firstWindow();
  await page.waitForFunction(() => typeof window.pacto?.request === 'function');
  await dismissLicense(page);
  await page.evaluate(() => window.pacto.request('saveProfile', {
    profile: { brand: 'Marca de teste', product: 'Produto de teste', audience: 'Público de teste' },
  }));
  await page.reload();
  await dismissLicense(page);
  await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: 'Marca', exact: true }).click();
  await page.getByRole('button', { name: 'Persona UGC', exact: true }).click();
  await page.getByRole('button', { name: 'Criar persona', exact: true }).click();

  const editor = page.getByRole('dialog', { name: 'Criar persona' });
  const preview = editor.locator(`img[src^="${previewPrefix}"]`);
  const upload = editor.getByRole('button', { name: 'Enviar foto-âncora' });
  const change = editor.getByRole('button', { name: 'Trocar foto-âncora' });
  const save = editor.getByRole('button', { name: 'Salvar avatar', exact: true });
  const error = editor.getByRole('alert');
  const mockPicker = result => electronApp.evaluate(({ dialog }, selection) => {
    dialog.showOpenDialog = async () => selection;
  }, result);
  const selectPath = file => mockPicker({ canceled: false, filePaths: [file] });
  async function expectPreview(bytes) {
    await expect(editor).toBeVisible();
    await expect(preview).toBeVisible();
    await expect(save).toBeEnabled();
    await expect(error).toHaveCount(0);
    await expect.poll(() => preview.evaluate(image => image.complete && image.naturalWidth
      ? image.getAttribute('src').length : 0)).toBe(previewPrefix.length + 4 * Math.ceil(bytes.length / 3));
  }

  await selectPath(fixture);
  await upload.click();
  await expectPreview(original);

  await selectPath(homeCopy);
  await change.click();
  await expectPreview(copy);

  await selectPath(pathToFileURL(fixture).href);
  await change.click();
  await expectPreview(original);
  await editor.evaluate(dialog => {
    const { left, top } = dialog.getBoundingClientRect();
    dialog.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: left - 1, clientY: top - 1 }));
  });
  await expect(editor).toBeVisible();

  const missing = join(userData, 'inexistente.png');
  await selectPath(missing);
  await change.click();
  await expect(error).toHaveText('Não foi possível ler a imagem.');
  await expect(editor).toBeVisible();
  await expect(preview).toBeVisible();
  await expect(save).toBeEnabled();

  await mockPicker({ canceled: false, filePaths: [] });
  await change.click();
  await expect(error).toHaveText('Não foi possível ler a imagem.');
  await expect(change).toBeEnabled();

  await mockPicker({ canceled: true, filePaths: [] });
  await change.click();
  await expect(change).toBeEnabled();
  await expect(error).toHaveCount(0);
  await expect(editor).toBeVisible();
  const hint = editor.locator('.ugc-persona-anchor-hint');
  await expect(hint).toHaveText('Se o seletor não abrir sua foto, arraste a imagem para cá.');

  const dropzone = editor.locator('.ugc-persona-photo');
  await dropzone.evaluate((target, bytes) => {
    const dt = new DataTransfer();
    dt.items.add(new File([new Uint8Array(bytes)], 'drop-ancora.png', { type: 'image/png' }));
    target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
  }, Array.from(copy));
  await expectPreview(copy);
  await expect(hint).toHaveCount(0);

  await dropzone.evaluate((target) => {
    const dt = new DataTransfer();
    dt.items.add(new File([new TextEncoder().encode('nao-eh-imagem')], 'ruim.txt', { type: 'text/plain' }));
    target.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }));
  });
  await expect(error).toHaveText('Não foi possível ler a imagem.');
  await expect(editor).toBeVisible();

  await expect.poll(async () => (await readLog()).some(entry =>
    entry.event === 'drop-ok' && entry.name === 'drop-ancora.png')).toBe(true);
  const entries = await readLog();
  const events = new Set(entries.map(entry => entry.event));
  for (const event of [
    'showOpenDialog-open', 'showOpenDialog-return', 'read-ok', 'read-error',
    'ipc-return', 'ipc-error', 'pickAnchor-setDraft', 'pickAnchor-error', 'dialog-close-blocked',
  ]) {
    assert.ok(events.has(event), `Evento ausente no log: ${event}`);
  }
  assert.deepEqual(entries.filter(entry => entry.event === 'read-ok').map(entry => entry.normalizedPath), [
    fixture, homeCopy, fixture, null,
  ]);
  assert.deepEqual(entries.filter(entry => entry.event === 'read-error').map(entry => entry.rawPath), [missing, null, null]);
  assert.ok(entries.some(entry => entry.event === 'dialog-close-blocked' && entry.reason === 'backdrop-click'));
  assert.ok(!events.has('dialog-close'), 'O editor fechou durante o teste.');

  console.log('Importação da foto-âncora e diagnóstico verificados no Electron.');
} finally {
  try {
    await electronApp?.close();
  } finally {
    await Promise.all([
      rm(userData, { recursive: true, force: true }),
      homeTemp && rm(homeTemp, { recursive: true, force: true }),
    ]);
  }
}

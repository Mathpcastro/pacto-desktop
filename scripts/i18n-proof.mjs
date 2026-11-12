import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { _electron, expect } from '@playwright/test';
import { createServer } from 'vite';

// Prova no Electron: o seletor de idioma troca a interface para espanhol e o pedido
// de configuração que a pessoa copiaria para a IA sai em espanhol. O padrão continua pt-BR.
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const userData = await mkdtemp(join(tmpdir(), 'carrossell-i18n-proof-'));
const vite = await createServer({ root, logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
await vite.listen();
const env = { ...process.env, PACTO_USER_DATA: userData, PACTO_AUTOPILOT_NO_TASKS: '1', PACTO_DEV_URL: `http://127.0.0.1:${vite.httpServer.address().port}` };
delete env.ELECTRON_RUN_AS_NODE;
const ok = (name) => console.log('✔', name);
let app;
try {
  app = await _electron.launch({ args: ['.'], cwd: root, env });
  const page = await app.firstWindow();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.waitForFunction(() => window.pacto);
  await page.evaluate(() => window.pacto.request('saveProfile', {
    profile: { brand: 'Idioma · prova', product: 'Agenda', audience: 'Clínicas', brandContext: '# CONTEXTO\n' + 'Agenda online. '.repeat(30), designKit: '# KIT\n' + 'Preto e branco. '.repeat(20) },
  }));
  await page.reload();
  await page.setViewportSize({ width: 1280, height: 860 });
  await expect(page.getByRole('button', { name: 'Início', exact: true })).toBeVisible({ timeout: 15000 });
  ok('abre em português');
  await page.getByRole('button', { name: /preferências/ }).click();
  await page.getByRole('button', { name: 'Español', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Inicio', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '¿Qué vamos a crear hoy?' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'Tema o idea' })).toHaveAttribute('placeholder', 'Escribe el tema, pega una idea o describe una referencia…');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  const prompt = await page.evaluate(async () => (await window.pacto.request('setupPrompt', { input: 'agenda online para clínicas' })).prompt);
  assert.match(prompt, /español latinoamericano neutro/);
  assert.match(prompt, /=== NOME DA MARCA ===/);
  assert.doesNotMatch(prompt, /Responda em português do Brasil/);
  const language = await page.evaluate(async () => (await window.pacto.request('bootstrap')).settings.language);
  assert.equal(language, 'es');
  ok('interface e pedido de configuração em espanhol');
  await page.getByRole('button', { name: 'Português', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Início', exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'pt-BR');
  ok('volta para português');
  assert.deepEqual(errors, []);
  ok('sem erros na página');
} finally {
  if (app) {
    const proc = app.process();
    await Promise.race([app.close().catch(() => {}), new Promise((resolveClose) => setTimeout(resolveClose, 8000))]);
    if (proc.exitCode === null) proc.kill();
  }
  await vite.close();
  await rm(userData, { recursive: true, force: true }).catch(() => {});
}

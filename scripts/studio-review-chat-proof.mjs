import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { _electron, expect } from '@playwright/test';
import { createServer } from 'vite';
import { Store } from '../core/store.mjs';

// Biblioteca isolada com texto revisado e histórico longo. Não usa conta ou IA.
const root = resolve('.');
const out = join(root, '.cache', 'studio-review-chat-proof');
await mkdir(out, { recursive: true });
const temp = resolve(tmpdir());
const userData = await mkdtemp(join(temp, 'carrossell-review-chat-'));
const executablePath = process.argv[2] ? resolve(process.argv[2]) : undefined;
const server = executablePath ? null : await createServer({ root, logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
let app;
try {
  const store = await new Store(join(userData, 'library')).init();
  const title = 'Revisão com conversa longa';
  const revisedTitle = 'Título revisado';
  const { id } = await store.createProject({ title, brief: 'Projeto de teste', style: 'tweet', cardCount: 5 });
  const longRequest = Array.from({ length: 5 }, (_, i) =>
    `Card ${i + 1}\n${'Reescreva o texto com uma ideia por card e mantenha a direção de arte aprovada. '.repeat(5)}`
  ).join('\n\n');
  await store.update(id, {
    status: 'ready',
    caption: 'Legenda revisada',
    slides: Array.from({ length: 5 }, (_, i) => ({ id: `card-${i + 1}`, index: i + 1, title: `${revisedTitle} ${i + 1}`, body: 'Texto final.' })),
    messages: [
      { id: 'msg-1', role: 'assistant', text: 'Primeira versão pronta.' },
      { id: 'msg-2', role: 'user', text: 'Quero ajustar a redação.' },
      { id: 'msg-3', role: 'assistant', text: 'Quais são os ajustes?' },
      { id: 'msg-4', role: 'user', text: longRequest },
      { id: 'msg-5', role: 'assistant', text: 'Ajustes prontos para revisão.' },
    ],
  });
  const env = {
    ...process.env, PACTO_USER_DATA: userData, PACTO_AUTOPILOT_NO_TASKS: '1',
    PACTO_UPDATE_URL: 'http://127.0.0.1:9/',
    PACTO_NOTICES_URL: 'http://127.0.0.1:9/notices.json',
  };
  delete env.ELECTRON_RUN_AS_NODE;
  delete env.PACTO_DEV_URL;
  if (server) {
    await server.listen();
    env.PACTO_DEV_URL = `http://127.0.0.1:${server.httpServer.address().port}`;
  }
  app = await _electron.launch({ executablePath, args: executablePath ? [] : ['.'], cwd: root, env });
  assert.equal(await app.evaluate(({ app }) => app.isPackaged), Boolean(executablePath));
  const page = await app.firstWindow();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1093, height: 580 });
  await page.waitForFunction(() => window.pacto);
  await page.evaluate(() => window.pacto.request('saveProfile', {
    profile: { brand: 'Marca de teste', product: 'Teste', audience: 'Teste' },
  }));
  await page.reload();
  const license = page.getByRole('dialog', { name: 'Ative sua licença' });
  await license.getByRole('button', { name: 'Agora não' }).click({ timeout: 8000 });
  await page.getByRole('button', { name: `Abrir ${title}`, exact: true }).click();
  const review = page.getByRole('complementary', { name: 'Revisão' });
  const checks = review.getByRole('checkbox');
  await expect(checks).toHaveCount(6);
  await expect(page.getByText(`${revisedTitle} 1`, { exact: true })).toBeVisible();
  await page.screenshot({ path: join(out, 'revisao.png') });
  // toBeVisible também aceita caixas cortadas por overflow. Testa o alvo real no ponto do clique.
  assert.equal(await checks.first().evaluate(el => {
    const rect = el.getBoundingClientRect();
    return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) === el;
  }), true, 'A conversa longa esconde a primeira caixa do checklist');
  const history = review.getByRole('region', { name: 'Histórico da conversa' });
  assert.equal(await history.evaluate(el => el.scrollTop + el.clientHeight >= el.scrollHeight - 1), true);
  await review.getByRole('button', { name: 'Ver conversa inteira (5)' }).click({ timeout: 3000 });
  await expect(history.getByText('Primeira versão pronta.', { exact: true })).toBeInViewport();
  await expect(review.getByRole('textbox', { name: 'Pedido para o assistente' })).toBeInViewport();
  await history.focus();
  await page.keyboard.press('End');
  await expect(history.getByText('Ajustes prontos para revisão.', { exact: true })).toBeInViewport();
  await page.evaluate(() => document.documentElement.style.setProperty('--app-zoom', '1.25'));
  for (const box of await checks.all()) await box.check({ timeout: 3000 });
  await page.getByRole('button', { name: 'Aprovar e criar capas', exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Etapas' }).getByRole('button', { name: 'Capa', exact: true })).toHaveAttribute('aria-current', 'step');
  await expect(page.getByRole('button', { name: 'Usar esta capa', exact: true })).toBeEnabled();
  const updated = await page.evaluate(async id => (await window.pacto.request('bootstrap')).projects.find(project => project.id === id), id);
  assert.equal(updated.textApproved, true);
  assert.equal(updated.slides.length, 5);
  assert.equal(updated.caption, 'Legenda revisada');
  assert.deepEqual(errors, []);
  console.log('Conversa longa, checklist, aprovação e geração de capas verificados no Electron.');
} finally {
  await app?.close().catch(() => {});
  await server?.close();
  if (dirname(userData) === temp && basename(userData).startsWith('carrossell-review-chat-')) {
    await rm(userData, { recursive: true, force: true, maxRetries: 3 });
  }
}

import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, expect } from '@playwright/test';
import { createServer } from 'vite';

// Renderer real, com transporte local simulado para não chamar Instagram nem Telegram.
const root = resolve('.');
const out = resolve('.cache/radar-navigation-proof');
await mkdir(out, { recursive: true });
const vite = await createServer({ root, logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
await vite.listen();
let browser;
try {
  browser = await chromium.launch(process.env.PACTO_TEST_BROWSER ? { executablePath: process.env.PACTO_TEST_BROWSER } : {});
  const page = await browser.newPage({ viewport: { width: 1440, height: 940 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const state = {
      profileId: 'principal', profiles: [{ id: 'principal', name: 'Principal' }, { id: 'outro', name: 'Outro perfil' }],
      profile: { brand: 'Marca de teste', brandContext: 'Contexto de teste', designKit: 'Design de teste' },
      brandInfo: { name: 'Marca de teste' }, projects: [], account: { connected: true },
      autopilot: { hasToken: true, paired: true, config: { enabled: true }, jobs: [
        { id: 'um', title: 'Aprove o roteiro antes de desenhar', status: 'ready', origin: 'routine', createdAt: '2026-11-11T15:00:00Z' },
        { id: 'dois', title: 'Três formas de encontrar sua próxima pauta', status: 'ready', origin: 'conversation', createdAt: '2026-11-11T14:00:00Z' },
        { id: 'erro', title: 'Um pedido precisa de atenção', status: 'error', createdAt: '2026-11-11T13:00:00Z' },
        { id: 'agendado', title: 'Um pedido agendado', status: 'scheduled', createdAt: '2026-11-11T12:00:00Z' },
      ] },
    };
    let receive;
    window.testCalls = [];
    window.testProfile = () => {
      state.profileId = 'outro';
      state.autopilot.jobs = [];
      receive({ type: 'profile', state: structuredClone(state) });
    };
    window.pacto = {
      onEvent(fn) { receive = fn; return () => {}; },
      async request(action, args) {
        if (action === 'bootstrap') return structuredClone(state);
        if (action === 'approveAutopilot') {
          window.testCalls.push(args);
          state.autopilot.jobs.find(job => job.id === args.id).status = 'published';
          return structuredClone(state);
        }
        return { ok: true };
      },
    };
  });
  await page.goto(`http://127.0.0.1:${vite.httpServer.address().port}`);
  await expect(page.getByRole('heading', { name: 'O que vamos criar hoje?' })).toBeVisible({ timeout: 12000 });
  const nav = page.getByRole('navigation', { name: 'Navegação principal' });
  const radar = nav.getByRole('button', { name: /^Radar/ });
  const home = nav.getByRole('button', { name: 'Início', exact: true });
  const queueLink = page.getByRole('button', { name: /carross(?:el|éis) para revisar/ });
  const tabs = page.getByRole('tablist', { name: 'Radar' });
  const review = tabs.getByRole('tab', { name: /^Para revisar/ });
  const ideas = tabs.getByRole('tab', { name: 'Ideias', exact: true });
  const pilot = tabs.getByRole('tab', { name: 'Piloto automático', exact: true });
  await expect(radar).toBeVisible({ timeout: 2500 });
  await expect(nav.getByRole('button')).toHaveCount(4);
  await expect(radar).toContainText('2');
  await expect(queueLink).toHaveText(/2 carrosséis para revisar/);
  await page.getByLabel('Tema ou ideia').fill('Rascunho que deve sobreviver ao Radar');
  await page.screenshot({ path: resolve(out, 'inicio.png') });
  await queueLink.click();
  await expect(review).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: 'Aguardando sua aprovação' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Publicar agora', exact: true })).toHaveCount(2);
  await expect(page.getByText('Um pedido precisa de atenção', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Configurar rotina', exact: true })).toHaveCount(0);
  await page.screenshot({ path: resolve(out, 'para-revisar.png') });
  await page.getByRole('button', { name: 'Abrir piloto', exact: true }).click();
  await expect(pilot).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('button', { name: 'Configurar rotina', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Publicar agora', exact: true })).toHaveCount(0);
  await page.screenshot({ path: resolve(out, 'piloto.png') });
  await pilot.focus();
  await page.keyboard.press('ArrowRight');
  await expect(ideas).toBeFocused();
  await expect(ideas).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('heading', { name: 'Ideias para testar' })).toBeVisible();
  await page.screenshot({ path: resolve(out, 'ideias.png') });
  await home.click();
  await expect(page.getByLabel('Tema ou ideia')).toHaveValue('Rascunho que deve sobreviver ao Radar');
  await radar.click();
  await expect(review).toHaveAttribute('aria-selected', 'true');
  for (const remaining of [1, 0]) {
    await page.getByRole('button', { name: 'Publicar agora', exact: true }).first().click();
    await page.getByRole('button', { name: 'Confirmar e publicar' }).click();
    await expect(page.getByRole('button', { name: 'Publicar agora', exact: true })).toHaveCount(remaining);
    if (remaining) await expect(radar).toContainText(String(remaining));
  }
  assert.deepEqual(await page.evaluate(() => window.testCalls.map(call => call.profileId)), ['principal', 'principal']);
  await home.click();
  await expect(queueLink).toHaveCount(0);
  await expect(radar).toHaveText('Radar');
  await radar.click();
  await expect(ideas).toHaveAttribute('aria-selected', 'true');
  await page.evaluate(() => window.dispatchEvent(new CustomEvent('pacto:navigate', { detail: 'pilot' })));
  await expect(pilot).toHaveAttribute('aria-selected', 'true');
  await review.click();
  await expect(page.getByText('Um pedido precisa de atenção', { exact: true })).toBeVisible();
  await page.evaluate(() => window.testProfile());
  await expect(page.getByText('Um pedido precisa de atenção', { exact: true })).toHaveCount(0);
  for (const [width, height] of [[1093, 580], [390, 844]]) {
    await page.setViewportSize({ width, height });
    for (const tab of [ideas, review, pilot]) {
      await tab.click();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    }
  }
  assert.deepEqual(errors, []);
  console.log('Radar, abas, atalhos, aprovação simulada, troca de perfil, teclado e larguras verificadas.');
} finally {
  await browser?.close();
  await vite.close();
}

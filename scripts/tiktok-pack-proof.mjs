// Electron real: com o Swipe File do Instagram já instalado, o ZIP dos slideshows do TikTok entra
// como segunda coleção da Biblioteca, sem tirar a primeira; a busca, o nicho, as views e o
// "Usar referência" funcionam na coleção nova.
// Uso: node scripts/tiktok-pack-proof.mjs <zip do TikTok> [pasta reference-packs já instalada]
import { _electron, expect } from '@playwright/test';
import { createServer } from 'vite';
import { cp, mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const zip = resolve(process.argv[2] || '');
const installed = process.argv[3] ? resolve(process.argv[3]) : null;
const root = resolve('.'), out = join(root, '.cache', 'tiktok-pack-proof');await mkdir(out, { recursive: true });
const userData = await mkdtemp(join(tmpdir(), 'carrossell-tiktok-pack-'));
if (installed) await cp(installed, join(userData, 'reference-packs'), { recursive: true });
await writeFile(join(userData, 'license-state.json'), JSON.stringify({ activated: true, expiresAt: new Date(Date.now() + 90 * 86400000).toISOString() }));
const env = { ...process.env, PACTO_USER_DATA: userData, PACTO_AUTOPILOT_NO_TASKS: '1', PACTO_NOTICES_URL: 'http://127.0.0.1:9/notices.json' };delete env.ELECTRON_RUN_AS_NODE;
const vite = await createServer({ root, logLevel: 'error', server: { host: '127.0.0.1', port: 0 } });
let app;
try {
  await vite.listen();env.PACTO_DEV_URL = `http://127.0.0.1:${vite.httpServer.address().port}`;
  app = await _electron.launch({ args: ['.'], cwd: root, env });const page = await app.firstWindow(), errors = [];page.on('pageerror', e => errors.push(e.message));
  await page.waitForFunction(() => window.pacto);
  await page.evaluate(() => window.pacto.request('saveProfile', { profile: { brand: 'Prova', product: 'App de estudos', audience: 'Estudantes', brandContext: 'App de estudos para universitários. '.repeat(5), designKit: 'Azul e branco. '.repeat(6) } }));
  await page.setViewportSize({ width: 1366, height: 900 });await page.reload();
  const license = page.getByRole('dialog', { name: 'Ative sua licença' });await license.waitFor({ timeout: 5000 }).then(() => license.getByRole('button', { name: 'Agora não' }).click()).catch(() => {});
  await app.evaluate(({ dialog }) => { dialog.showMessageBox = async () => ({ response: 0 }); });
  const started = Date.now();
  const result = await page.evaluate(file => window.pacto.request('importReferencePack', { file }), zip);
  console.log(`✔ ZIP do TikTok importado: ${result.count} slideshows em ${((Date.now() - started) / 1000).toFixed(1)} s`);
  const catalog = await page.evaluate(() => window.pacto.request('referenceCatalog'));
  console.log('  coleções:', catalog.packs.map(p => `${p.title} (${p.items.length})`).join(' + '));
  if (installed && catalog.packs.length !== 2) throw new Error('o Swipe File do Instagram sumiu');
  await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: /^Biblioteca/ }).click();
  const tiktok = page.getByRole('group', { name: 'Coleções da Biblioteca' }).getByRole('button', { name: /TikTok/ });
  await tiktok.click();await expect(tiktok).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.reference-count')).toContainText(`${result.count} referências`);
  await expect(page.getByText(/views/).first()).toBeVisible();
  await page.screenshot({ path: join(out, 'biblioteca-tiktok.png') });
  await page.getByRole('group', { name: /Nicho/ }).getByRole('button', { name: 'Estudos' }).click();
  await expect(page.locator('.reference-count')).not.toContainText(`${result.count} referências`);
  console.log('✔ coleção TikTok com views, salvos e filtro por nicho (Estudos):', await page.locator('.reference-count').innerText());
  await page.locator('.reference-use').first().click();
  await expect(page.getByText(/anexada\. Seu tema foi preservado/)).toBeVisible();
  await page.screenshot({ path: join(out, 'usar-referencia.png') });
  console.log('✔ Usar referência anexou o slideshow ao criador');
  if (installed) {
    await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('button', { name: /^Biblioteca/ }).click();
    await page.getByRole('group', { name: 'Coleções da Biblioteca' }).getByRole('button').first().click();
    await expect(page.locator('.reference-count')).toContainText('500 referências');
    console.log('✔ o Swipe File do Instagram continua com as 500');
  }
  if (errors.length) throw new Error(errors.join('\n'));console.log('✔ sem erros de página');
} finally {
  const proc = app?.process();await Promise.race([app?.close().catch(() => {}), new Promise(r => setTimeout(r, 8000))]);if (proc && proc.exitCode === null) proc.kill();
  await vite.close();await rm(userData, { recursive: true, force: true }).catch(() => {});
}
process.exit(process.exitCode || 0);

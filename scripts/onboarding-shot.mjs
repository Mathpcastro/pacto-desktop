import { mkdir, mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron } from "@playwright/test";
import { createServer } from "vite";

// Capturas do primeiro uso (onboarding) num perfil vazio, sem conta conectada.
// Uso: node scripts/onboarding-shot.mjs [pasta]
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] || join(root, ".cache", "onboarding-shot"));
await mkdir(out, { recursive: true });
const userData = await mkdtemp(join(tmpdir(), "carrossell-onboarding-"));
const server = await createServer({ root, logLevel: "error", server: { host: "127.0.0.1", port: 0, strictPort: false } });
let app;
try {
  await server.listen();
  app = await _electron.launch({ args: ["."], cwd: root, env: { ...process.env, PACTO_USER_DATA: userData, PACTO_DEV_URL: `http://127.0.0.1:${server.httpServer.address().port}` } });
  const page = await app.firstWindow();
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByRole("region", { name: "Configuração do projeto" }).waitFor({ timeout: 30000 });
  await page.screenshot({ path: join(out, "01-onboarding.png") });
  await page.getByRole("button", { name: /formulário/i }).first().click().catch(() => {});
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(out, "02-formulario.png") });
  const small = await page.evaluate(() => [...document.querySelectorAll("body *")].filter((el) => [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && parseFloat(getComputedStyle(el).fontSize) < 13 && el.getBoundingClientRect().width > 0).map((el) => `${el.className}:${getComputedStyle(el).fontSize}:${el.textContent.trim().slice(0, 12)}`));
  console.log(JSON.stringify({ out, small }));
} finally {
  if (app) await app.evaluate(({ app }) => app.exit(0)).catch(() => {});
  await server.close();
}

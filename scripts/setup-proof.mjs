import { copyFile, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron } from "@playwright/test";
import { createServer } from "vite";

// Prova real do começo rápido com a conta ChatGPT deste computador: na primeira tela,
// cola o link do produto e clica em "Gerar com a minha conta". O app lê a página e monta
// o Contexto da Marca e o Design Kit, que aparecem para revisão na tela final.
// Uso: node scripts/setup-proof.mjs [link] [pasta-de-saída]
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const link = process.argv[2] || "https://carrosseisquevendem.com.br/app/";
const out = resolve(process.argv[3] || join(root, ".cache", "setup-proof"));
await mkdir(out, { recursive: true });
const userData = await mkdtemp(join(tmpdir(), "carrossell-setup-"));
await mkdir(join(userData, "codex"), { recursive: true });
await copyFile(join(process.env.CODEX_HOME || join(homedir(), ".codex"), "auth.json"), join(userData, "codex", "auth.json"));
const server = await createServer({ root, logLevel: "error", server: { host: "127.0.0.1", port: 0, strictPort: false } });
let application;
try {
  await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}`;
  application = await _electron.launch({ args: ["."], cwd: root, env: { ...process.env, PACTO_USER_DATA: userData, PACTO_DEV_URL: url } });
  const page = await application.firstWindow();
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByRole("heading", { name: "O que você vende?" }).waitFor({ timeout: 30000 });
  const end = Date.now() + 120000;
  while (!(await page.evaluate(async () => (await window.pacto.request("bootstrap")).account?.connected)) && Date.now() < end) await page.waitForTimeout(2000);
  await page.getByLabel("O que você vende").fill(link);
  const started = Date.now();
  await page.getByRole("button", { name: /Gerar com a minha conta/ }).click();
  await page.waitForTimeout(4000);
  await page.screenshot({ path: join(out, "1-gerando.png") });
  await page.getByRole("heading", { name: "Tudo pronto para criar" }).waitFor({ timeout: 900000 });
  const seconds = Math.round((Date.now() - started) / 1000);
  await page.locator("details.doc-peek").first().locator("summary").click();
  await page.screenshot({ path: join(out, "2-pronto.png") });
  const s = await page.evaluate(() => window.pacto.request("bootstrap"));
  await writeFile(join(out, "contexto-da-marca.md"), s.onboarding.brand.document);
  await writeFile(join(out, "design-kit.md"), s.onboarding.design.document);
  const result = { link, seconds, brandName: s.onboarding.brand.brandName, brandChars: s.onboarding.brand.document.length, designChars: s.onboarding.design.document.length, hypotheses: (s.onboarding.brand.document.match(/HIPÓTESE/gi) || []).length, nameField: await page.getByLabel("Nome da marca").inputValue() };
  await writeFile(join(out, "resultado.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  if (application) await application.evaluate(({ app }) => app.exit(0)).catch(() => {});
  await server.close();
}

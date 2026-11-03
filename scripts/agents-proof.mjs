import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron } from "@playwright/test";
import { createServer } from "vite";

// Agent setup remains real; discovery replaces the old promotional home banner.
// No installation or model invocation occurs. Usage: node scripts/agents-proof.mjs [folder].
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] || join(root, ".cache", "agents-proof"));
await mkdir(out, { recursive: true });
const userData = await mkdtemp(join(tmpdir(), "carrossell-agents-"));
const server = await createServer({ root, logLevel: "error", server: { host: "127.0.0.1", port: 0, strictPort: false } });
await server.listen();
const env = { ...process.env, PACTO_USER_DATA: userData, PACTO_DEV_URL: `http://127.0.0.1:${server.httpServer.address().port}` };
delete env.ELECTRON_RUN_AS_NODE;
const app = await _electron.launch({ args: ["."], cwd: root, env });
const step = (name) => console.log("✔", name);
try {
  const page = await app.firstWindow();
  await page.waitForFunction(() => window.pacto);
  await page.evaluate(() => window.pacto.request("saveProfile", { profile: { brand: "Ana Doces", brandContext: "# CONTEXTO\n\n" + "público. ".repeat(30), designKit: "# DESIGN KIT\n\n" + "regra. ".repeat(30) } }));
  await page.reload();
  await page.getByRole("heading", { name: "O que vamos criar hoje?" }).waitFor();
  await page.screenshot({ path: join(out, "01-inicio.png") });
  assert.equal(await page.getByRole("region", { name: "Usar com um agente" }).count(), 0);
  step("home sem banner de agentes, com descoberta visível");

  await page.getByRole("button", { name: "O que posso fazer no Carrossell?", exact: true }).click();
  const discovery = page.getByRole("dialog", { name: "O que posso fazer no Carrossell?", exact: true });
  await discovery.getByRole("button", { name: "Usar com agentes e CLI", exact: true }).click();
  await discovery.getByRole("button", { name: "Usar com Claude Code", exact: true }).click();
  const modal = page.getByRole("dialog", { name: "Gere carrosséis pelo Claude, Gemini ou Codex" });
  await modal.getByText("Abra o Claude Code e peça em palavras").first().waitFor();
  await page.screenshot({ path: join(out, "02-modal.png") });
  await modal.getByRole("button", { name: "Copiar pedido" }).first().click();
  await page.getByText("Pedido copiado. Cole no seu agente.").waitFor();
  assert.match(await app.evaluate(({ clipboard }) => clipboard.readText()), /carrossell ajuda --agente/);
  step("modal com instalar, guia e pedidos prontos para copiar");
  await modal.getByRole("button", { name: "Fechar janela" }).click();

  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: /Conta conectada e preferências|Conectar conta e preferências/ }).click();
  await page.screenshot({ path: join(out, "03-menu-avatar.png") });
  await page.getByRole("button", { name: /Usar com agentes/ }).click();
  await modal.waitFor();
  await modal.getByRole("button", { name: "Fechar janela" }).click();
  await page.keyboard.press("Control+K");
  await page.keyboard.type("agente");
  await page.getByText("Usar o Carrossell com agentes e CLI").waitFor();
  step("configuração continua no menu do avatar; Ctrl K abre a descoberta de agentes");
} finally {
  await app.close().catch(() => {});
  await server.close();
  await rm(userData, { recursive: true, force: true }).catch(() => {});
}

import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron } from "@playwright/test";
import { createServer } from "vite";

// Prova do destaque para agentes: card no Início, modal com o passo a passo, "Agora não" que some de
// vez, e os atalhos discretos (menu do avatar e Ctrl K). Uso: node scripts/agents-proof.mjs [pasta]
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] || join(root, ".cache", "agents-proof"));
await mkdir(out, { recursive: true });
const userData = await mkdtemp(join(tmpdir(), "carrossell-agents-"));
const server = await createServer({ root, logLevel: "error", server: { host: "127.0.0.1", port: 0, strictPort: false } });
await server.listen();
const app = await _electron.launch({ args: ["."], cwd: root, env: { ...process.env, PACTO_USER_DATA: userData, PACTO_DEV_URL: `http://127.0.0.1:${server.httpServer.address().port}` } });
const step = (name) => console.log("✔", name);
try {
  const page = await app.firstWindow();
  await page.waitForFunction(() => window.pacto);
  await page.evaluate(() => window.pacto.request("saveProfile", { profile: { brand: "Ana Doces", brandContext: "# CONTEXTO\n\n" + "público. ".repeat(30), designKit: "# DESIGN KIT\n\n" + "regra. ".repeat(30) } }));
  await page.reload();
  const card = page.getByRole("region", { name: "Usar com um agente" });
  await card.waitFor();
  await page.screenshot({ path: join(out, "01-inicio.png") });
  step("card de uma linha no Início, logo abaixo da caixa de criar");

  await card.getByRole("button", { name: "Configurar em 1 minuto" }).click();
  const modal = page.getByRole("dialog", { name: "Use o Carrossell pelo seu agente" });
  await modal.getByText("Peça em palavras").first().waitFor();
  await page.screenshot({ path: join(out, "02-modal.png") });
  await modal.getByRole("button", { name: "Copiar pedido" }).first().click();
  await page.getByText("Pedido copiado").waitFor();
  assert.match(await app.evaluate(({ clipboard }) => clipboard.readText()), /carrossell ajuda --agente/);
  step("modal com instalar, guia e pedidos prontos para copiar");
  await modal.getByRole("button", { name: "Fechar janela" }).click();

  await card.getByRole("button", { name: "Agora não" }).click();
  await page.reload();
  await page.getByRole("heading", { name: "O que vamos publicar hoje?" }).waitFor();
  assert.equal(await page.getByRole("region", { name: "Usar com um agente" }).count(), 0);
  step("'Agora não' tira o card do Início de vez");

  await page.getByRole("button", { name: /Conta conectada e preferências|Conectar conta e preferências/ }).click();
  await page.screenshot({ path: join(out, "03-menu-avatar.png") });
  await page.getByRole("button", { name: /Usar com agentes/ }).click();
  await modal.waitFor();
  await modal.getByRole("button", { name: "Fechar janela" }).click();
  await page.keyboard.press("Control+K");
  await page.keyboard.type("agente");
  await page.getByText("Usar o Carrossell com um agente").waitFor();
  step("depois, o modal continua no menu do avatar e no Ctrl K");
} finally {
  await app.close().catch(() => {});
  await server.close();
  await rm(userData, { recursive: true, force: true }).catch(() => {});
}

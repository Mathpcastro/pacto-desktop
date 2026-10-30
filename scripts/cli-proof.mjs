import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { _electron } from "@playwright/test";
import { createServer } from "vite";

// Prova da CLI com o app aberto: a janela acompanha o que o agente faz, e a página Marca mostra
// "Usar com agentes". Nada de IA: o carrossel usa o estilo Tweet, renderizado pelo próprio app.
// Uso: node scripts/cli-proof.mjs [pasta-de-saída]
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] || join(root, ".cache", "cli-proof"));
await mkdir(out, { recursive: true });
const userData = await mkdtemp(join(tmpdir(), "carrossell-cli-"));
const env = { ...process.env, PACTO_USER_DATA: userData };
const cli = async (...args) => JSON.parse((await promisify(execFile)(process.execPath, [join(root, "cli", "carrossell.mjs"), ...args], { env, cwd: root })).stdout);
const server = await createServer({ root, logLevel: "error", server: { host: "127.0.0.1", port: 0, strictPort: false } });
await server.listen();
const url = `http://127.0.0.1:${server.httpServer.address().port}`;
const app = await _electron.launch({ args: ["."], cwd: root, env: { ...env, PACTO_DEV_URL: url } });
const step = (name) => console.log("✔", name);
try {
  const page = await app.firstWindow();
  await page.waitForFunction(() => window.pacto);
  await page.evaluate(() => window.pacto.request("saveProfile", { profile: { brand: "Agendei", brandContext: "# CONTEXTO\n\n" + "público. ".repeat(30), designKit: "# DESIGN KIT\n\n" + "regra. ".repeat(30) } }));
  await page.reload();
  await page.getByRole("button", { name: /^Marca$/ }).click();
  await page.getByRole("navigation", { name: "Seções da marca" }).getByRole("button", { name: /^Agentes/ }).click();
  const section = page.getByRole("region", { name: "Usar com agentes" });
  await section.scrollIntoViewIfNeeded();
  await section.getByText("node ").waitFor();
  await section.screenshot({ path: join(out, "01-marca-agentes.png") });
  step("Marca mostra a seção de agentes com o comando de desenvolvimento");

  const ping = await cli("chamar", "ping");
  assert.equal(ping.headless, false, "a CLI usa o app aberto, sem abrir outro");
  assert.equal(ping.window, true);
  step("a CLI conversa com o app aberto");

  await page.getByRole("button", { name: /Início/ }).click();
  const p = await cli("chamar", "createProject", "--json", JSON.stringify({ title: "Criado pelo agente", brief: "teste", style: "tweet" }));
  await page.getByText("Criado pelo agente").first().waitFor({ timeout: 10000 });
  await page.screenshot({ path: join(out, "02-inicio-com-projeto-do-agente.png") });
  step("o carrossel criado pela CLI aparece na janela na hora");

  await cli("editar", p.id, "--json", JSON.stringify({ caption: "Legenda.", slides: [{ id: "a", role: "Capa", title: "Feito pela CLI", body: "" }, { id: "b", role: "CTA", title: "Comente QUERO", body: "" }] }));
  await cli("aprovar", p.id);
  await cli("capas", p.id);
  const done = await cli("escolher-capa", p.id, "1");
  assert.equal(done.status, "complete");
  const folder = join(userData, "exportado");
  await cli("exportar", p.id, "--pasta", folder);
  assert.deepEqual((await readdir(folder)).sort(), ["01.png", "02.png", "legenda.txt"]);
  step("criar → aprovar → capa → exportar pela CLI com o app aberto");

  const ana = await cli("perfil", "criar", "Cliente Ana");
  await cli("chamar", "createProject", "--perfil", "ana", "--json", JSON.stringify({ title: "Só da Ana", brief: "x" }));
  await page.waitForTimeout(800);
  assert.equal(await page.getByText("Só da Ana").count(), 0, "projeto de outro perfil não entra na janela");
  assert.equal(ana.active, "principal");
  step("trabalho em outro perfil não mexe na janela");
} finally {
  await app.close().catch(() => {});
  await server.close();
  await rm(userData, { recursive: true, force: true }).catch(() => {});
}

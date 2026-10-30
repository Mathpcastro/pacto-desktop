import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron } from "@playwright/test";
import { createServer } from "vite";

// Prova dos perfis (multicontas) no Electron real: criar, trocar, isolar e excluir pela interface.
// Nada de IA: as marcas são escritas à mão. Uso: node scripts/profiles-proof.mjs [pasta-de-saída]
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] || join(root, ".cache", "profiles-proof"));
await mkdir(out, { recursive: true });
const userData = await mkdtemp(join(tmpdir(), "carrossell-profiles-"));
const server = await createServer({ root, logLevel: "error", server: { host: "127.0.0.1", port: 0, strictPort: false } });
await server.listen();
const url = `http://127.0.0.1:${server.config.server.port || server.httpServer.address().port}`;
const app = await _electron.launch({ args: ["."], cwd: root, env: { ...process.env, PACTO_USER_DATA: userData, PACTO_DEV_URL: url } });
const steps = [];
const step = (name) => (steps.push(name), console.log("✔", name));
try {
  const page = await app.firstWindow();
  await page.waitForFunction(() => window.pacto);
  const brand = (name) => ({ brand: name, brandContext: `# CONTEXTO OFICIAL DA MARCA\n\n${name}: ${"detalhe do público. ".repeat(12)}`, designKit: `# DESIGN KIT OFICIAL\n\n${"regra visual. ".repeat(12)}` });
  await page.evaluate(async (p) => { await window.pacto.request("saveProfile", { profile: p }); await window.pacto.request("createProject", { title: "Carrossel do Principal", brief: "pauta" }); }, brand("Agendei"));
  await page.reload();
  const switcher = page.getByRole("button", { name: /^Perfil: Principal/ });
  await switcher.waitFor();
  step("seletor mostra o perfil Principal");
  await page.screenshot({ path: join(out, "01-principal.png") });

  await switcher.click();
  await page.getByRole("button", { name: /Novo perfil/ }).click();
  await page.getByLabel("Nome do novo perfil").fill("Cliente Ana");
  await page.screenshot({ path: join(out, "02-novo-perfil.png") });
  await page.getByRole("button", { name: "Criar", exact: true }).click();
  await page.getByRole("button", { name: /^Perfil: Cliente Ana/ }).waitFor();
  await page.getByText("O que você vende?").waitFor();
  step("perfil novo abre o onboarding vazio");
  await page.screenshot({ path: join(out, "03-ana-onboarding.png") });

  await page.evaluate(async (p) => { const s = await window.pacto.request("bootstrap"); await window.pacto.request("saveProfile", { profileId: s.profileId, profile: p }); }, brand("Ana Doces"));
  await page.reload();
  await page.getByRole("button", { name: /^Perfil: Cliente Ana/ }).waitFor();
  assert.equal(await page.getByText("Carrossel do Principal").count(), 0, "o projeto do Principal não aparece na Ana");
  step("o perfil da Ana não vê os carrosséis do Principal");
  await page.screenshot({ path: join(out, "04-ana-inicio.png") });

  await page.getByRole("button", { name: /^Perfil: Cliente Ana/ }).click();
  await page.screenshot({ path: join(out, "05-menu-perfis.png") });
  await page.getByRole("menuitemradio", { name: "Principal" }).click();
  await page.getByRole("button", { name: /^Perfil: Principal/ }).waitFor();
  await page.getByText("Carrossel do Principal").first().waitFor();
  step("trocar de volta mostra o carrossel do Principal");

  // A CLI vai trocar o perfil ativo por fora: a janela acompanha pelo evento "profile".
  const anaId = await page.evaluate(async () => (await window.pacto.request("profiles")).profiles.find((p) => p.name === "Cliente Ana").id);
  await page.evaluate(async (id) => window.pacto.request("switchProfile", { id }), anaId);
  await page.getByRole("button", { name: /^Perfil: Cliente Ana/ }).waitFor();
  step("troca vinda de fora é seguida pela janela");

  await page.getByRole("button", { name: /^Perfil: Cliente Ana/ }).click();
  await page.getByRole("button", { name: /Gerenciar perfis/ }).click();
  await page.getByRole("button", { name: /Excluir o perfil Cliente Ana/ }).click();
  await page.screenshot({ path: join(out, "06-excluir.png") });
  await page.getByRole("button", { name: "Apagar tudo deste perfil" }).click();
  await page.getByRole("button", { name: /^Perfil: Principal/ }).waitFor();
  step("excluir o perfil ativo volta para o Principal");
  console.log(JSON.stringify({ passed: steps.length, out }));
} finally {
  await app.close().catch(() => {});
  await server.close();
  await rm(userData, { recursive: true, force: true }).catch(() => {});
}

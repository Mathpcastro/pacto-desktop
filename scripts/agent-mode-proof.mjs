import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron } from "@playwright/test";
import { createServer } from "vite";
import { main } from "../cli/carrossell.mjs";

// Prova do modo agente na janela real, sem conta ChatGPT: o caminho Claude/Gemini no onboarding,
// a janela de agentes e um carrossel criado pela CLI (como um agente faria) aparecendo no Início ao vivo.
// Uso: node scripts/agent-mode-proof.mjs [pasta-de-saída]
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] || join(root, ".cache", "agent-mode-proof"));
await mkdir(out, { recursive: true });
const userData = await mkdtemp(join(tmpdir(), "carrossell-agente-"));
const server = await createServer({ root, logLevel: "error", server: { host: "127.0.0.1", port: 0, strictPort: false } });
const step = (name, data = {}) => console.log(JSON.stringify({ name, ...data }));
const cli = async (...argv) => {
  const chunks = [], write = process.stdout.write;
  process.stdout.write = (c) => (chunks.push(String(c)), true);
  try { await main(argv, { userData }); } finally { process.stdout.write = write; }
  return JSON.parse(chunks.join(""));
};
const file = async (name, text) => { const path = join(userData, name); await writeFile(path, text); return path; };
let application;
try {
  await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}`;
  application = await _electron.launch({ args: ["."], cwd: root, env: { ...process.env, PACTO_USER_DATA: userData, PACTO_DEV_URL: url } });
  const page = await application.firstWindow();
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.waitForFunction(() => window.pacto?.request, null, { timeout: 60000 });
  await page.waitForTimeout(1500);
  // Onboarding: a primeira tela já mostra o caminho sem ChatGPT.
  await page.screenshot({ path: join(out, "1-onboarding.png") });
  await page.getByRole("button", { name: /Gerar com Claude ou Gemini/ }).click();
  await page.waitForTimeout(500);
  await page.screenshot({ path: join(out, "2-janela-claude.png") });
  await page.getByRole("button", { name: "Gemini", exact: true }).click();
  await page.screenshot({ path: join(out, "3-janela-gemini.png") });
  await page.keyboard.press("Escape");
  step("telas do caminho", { out });
  // O "agente": marca, texto e cards pela CLI, com a janela aberta.
  await cli("marca", "salvar", "--contexto", await file("c.md", "# Contexto\nAgendei: agenda online para clínicas pequenas."), "--design", await file("d.md", "# Design\nVerde #3CC8A0, grafite #1E2328, branco #FFFFFF."), "--nome", "Agendei");
  const p = await cli("criar", "--pauta", "Mensagens que reduzem faltas", "--cards", "4", "--estilo", "textopreto", "--agente", "claude");
  const slide = (id, title, body) => ({ id, role: id, title, body, emphasis: "", visual: "", prompt: "", asset: "" });
  await cli("texto", p.id, "--arquivo", await file("t.json", JSON.stringify({ title: "Mensagens que reduzem faltas", architecture: "Lista Útil", editorialLine: "", visualConcept: "", coverHooks: [], caption: "Comente CHECKLIST", reply: "", regenerateSlideIds: [],
    slides: [slide("a", "3 mensagens que reduzem faltas", "Comente CHECKLIST"), slide("b", "Confirme na véspera", "No dia, quem esqueceu já marcou outra coisa."), slide("c", "Dê duas opções", "Responda 1 para confirmar ou 2 para remarcar."), slide("d", "Quer o modelo?", "Comente CHECKLIST")] })));
  await cli("aprovar", p.id);
  await cli("capas", p.id);
  const covered = await cli("projeto", p.id);
  await cli("escolher-capa", p.id, String(covered.coverOptions[0].n));
  const done = await cli("gerar", p.id);
  step("carrossel do agente", { id: p.id, status: done.status, cards: done.slides.length });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(out, "4-inicio-com-carrossel.png") });
  await page.locator(".lib-item").first().scrollIntoViewIfNeeded().catch(() => {});
  await page.screenshot({ path: join(out, "5-biblioteca.png") });
  const shown = await page.getByText("Mensagens que reduzem faltas").count();
  const chip = await page.locator(".lib-item .chip", { hasText: "Claude" }).count();
  step("no app", { titulo: shown > 0, chipClaude: chip > 0 });
} finally {
  await application?.close().catch(() => {});
  await server.close().catch(() => {});
}

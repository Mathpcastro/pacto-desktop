import { copyFile, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron, expect } from "@playwright/test";
import { createServer } from "vite";

// Prova real: uma cena vira uma série de fotos do mesmo ambiente (conta ChatGPT
// deste computador) e o carrossel Texto + foto usa uma foto diferente em cada card.
// Uso: node scripts/scene-series-proof.mjs [pasta-de-saída]
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] || join(root, ".cache", "scene-series-proof"));
await mkdir(out, { recursive: true });
const userData = await mkdtemp(join(tmpdir(), "carrossell-series-"));
await mkdir(join(userData, "codex"), { recursive: true });
await copyFile(join(process.env.CODEX_HOME || join(homedir(), ".codex"), "auth.json"), join(userData, "codex", "auth.json"));
const server = await createServer({ root, logLevel: "error", server: { host: "127.0.0.1", port: 0, strictPort: false } });
async function until(page, predicate, timeout) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await page.evaluate(predicate).catch(() => false)) return;
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("Tempo esgotado aguardando o aplicativo.");
}
let application;
try {
  await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}`;
  application = await _electron.launch({ args: ["."], cwd: root, env: { ...process.env, PACTO_USER_DATA: userData, PACTO_DEV_URL: url } });
  const page = await application.firstWindow();
  await page.setViewportSize({ width: 1366, height: 768 });
  await until(page, async () => (await window.pacto.request("bootstrap")).account?.connected, 120000);
  const id = await page.evaluate(async () => {
    const r = window.pacto.request;
    await r("saveProfile", { profile: { brand: "Agendei", brandContext: "Agenda online e lembretes por WhatsApp para clínicas pequenas de estética.", designKit: "#3CC8A0 destaque #1E2328 texto #FFFFFF fundo #F5F7F6 apoio" } });
    await r("saveMedia", { displayName: "Agendei", handle: "agendei.app", addScenes: [{ label: "Recepção da clínica pela manhã", prompt: "Balcão de recepção de uma pequena clínica de estética, com agenda de papel, xícara de café, plantas e luz natural da janela." }] });
    const scene = (await r("bootstrap")).media.scenes[0];
    await r("saveMedia", { scene: { id: scene.id, status: "approved" } });
    const p = await r("createProject", { title: "Série de fotos · prova", brief: "Texto escrito à mão para a prova.", style: "fototexto" });
    await r("saveProject", { id: p.id, slides: [
      { id: "a", title: "Sua recepção começa antes do paciente chegar", emphasis: "antes" },
      { id: "b", title: "Confirme na véspera, não no dia", body: "Dá tempo de remarcar se precisar." },
      { id: "c", title: "Deixe o endereço na mensagem", body: "Com referência e link do mapa." },
      { id: "d", title: "Diga como desmarcar", body: "Quem sabe como avisar, avisa." },
    ] });
    await r("approveText", { id: p.id });
    return p.id;
  });
  await page.reload();
  await page.getByRole("button", { name: "Abrir Série de fotos · prova", exact: true }).click();
  // A capa pede as fotos: a faixa oferece gerar a série para os 4 cards.
  await page.getByRole("button", { name: "Gerar opções de capa" }).click().catch(() => {});
  await expect(page.locator(".cover-opt")).toHaveCount(3, { timeout: 60000 });
  await page.getByRole("button", { name: "Usar esta capa" }).click();
  await page.getByRole("button", { name: /Gerar fotos/ }).waitFor({ timeout: 60000 }).catch(() => {});
  await page.screenshot({ path: join(out, "01-antes-da-serie.png") });
  // Sem fotos ainda: gera a primeira pela Marca e completa pela faixa do estúdio.
  await page.evaluate(async () => {
    const scene = (await window.pacto.request("bootstrap")).media.scenes[0];
    await window.pacto.request("sceneImage", { id: scene.id, count: 1 });
  });
  await page.reload();
  await page.getByRole("button", { name: "Abrir Série de fotos · prova", exact: true }).click();
  await page.getByRole("navigation", { name: "Etapas" }).getByRole("button", { name: "Carrossel" }).click();
  await page.screenshot({ path: join(out, "01b-uma-foto.png") });
  await page.getByRole("button", { name: /Gerar fotos/ }).click();
  await until(page, async () => { const s = await window.pacto.request("bootstrap"); return !s.working && s.media.scenes[0].images.length >= 4; }, 1500000);
  await until(page, async () => { const s = await window.pacto.request("bootstrap"); const p = s.projects[0]; return p.status !== "generating"; }, 120000);
  const state = await page.evaluate(() => window.pacto.request("bootstrap"));
  const scene = state.media.scenes[0];
  for (const [i, img] of scene.images.entries()) await writeFile(join(out, `foto-${i + 1}.png`), Buffer.from(img.split(",")[1], "base64"));
  const p = state.projects.find((x) => x.id === id);
  for (const [i, s] of p.slides.entries()) await writeFile(join(out, `card-${i + 1}.png`), Buffer.from(s.image.split(",")[1], "base64"));
  await page.screenshot({ path: join(out, "02-carrossel-serie.png") });
  const distinct = new Set(p.slides.map((s) => s.image)).size;
  console.log(JSON.stringify({ photos: scene.images.length, cards: p.slides.length, distinctCards: distinct, out }));
} finally {
  if (application) await application.evaluate(({ app }) => app.exit(0)).catch(() => {});
  await server.close();
}

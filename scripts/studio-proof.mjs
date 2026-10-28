import { copyFile, mkdir, mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron, expect } from "@playwright/test";
import { createServer } from "vite";

// Prova real do estúdio com a conta ChatGPT deste computador (direção A):
// texto gerado → estilo Tweet → CTA/DM → material gratuito em PDF → cenas e
// foto gerada → estilo Texto + foto → uma capa com Arte com IA.
// Uso: node scripts/studio-proof.mjs [pasta-de-saída]
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] || join(root, ".cache", "studio-proof"));
await mkdir(out, { recursive: true });
const userData = await mkdtemp(join(tmpdir(), "carrossell-proof-"));
await mkdir(join(userData, "codex"), { recursive: true });
await copyFile(join(process.env.CODEX_HOME || join(homedir(), ".codex"), "auth.json"), join(userData, "codex", "auth.json"));
const server = await createServer({ root, logLevel: "error", server: { host: "127.0.0.1", port: 0, strictPort: false } });
const log = [];
const step = (name, data = {}) => {
  log.push({ name, at: new Date().toISOString(), ...data });
  console.log(JSON.stringify({ name, ...data }));
};
async function until(page, predicate, arg, timeout) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await page.evaluate(predicate, arg).catch(() => false)) return;
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("Tempo esgotado aguardando o aplicativo.");
}
const state = (page) => page.evaluate(() => window.pacto.request("bootstrap"));
const project = async (page, id) => (await state(page)).projects.find((p) => p.id === id);
const idle = (page, id, timeout = 900000) =>
  until(page, async (id) => { const s = await window.pacto.request("bootstrap"); const p = s.projects.find((x) => x.id === id); return p && !["planning", "generating"].includes(p.status) && !s.working; }, id, timeout);
const free = (page, timeout = 900000) => until(page, async () => !(await window.pacto.request("bootstrap")).working, null, timeout);
let application;
try {
  await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}`;
  application = await _electron.launch({ args: ["."], cwd: root, env: { ...process.env, PACTO_USER_DATA: userData, PACTO_DEV_URL: url } });
  await application.evaluate(({ dialog }, folder) => {
    dialog.showSaveDialog = async (_w, options) => ({ canceled: false, filePath: `${folder}\\${options.defaultPath}` });
  }, out);
  const page = await application.firstWindow();
  await page.setViewportSize({ width: 1366, height: 768 });
  await until(page, async () => (await window.pacto.request("bootstrap")).account?.connected, null, 120000);
  step("conectado");
  // Contexto e Design Kit de exemplo (entrada escrita à mão; as saídas abaixo são da IA).
  await page.evaluate(async () => {
    await window.pacto.request("saveProfile", {
      profile: {
        brand: "Agendei",
        brandContext:
          "# CONTEXTO OFICIAL DA MARCA\n## Agendei\nAgenda online com confirmação e lembretes automáticos por WhatsApp para clínicas pequenas de estética e fisioterapia (1 a 5 profissionais).\nPúblico: donas de clínica que perdem tempo confirmando consultas e sofrem com faltas.\nPromessa: menos tempo confirmando e menos horários vazios, sem prometer fim das faltas.\nTom: prático, direto e leve.\nMaterial gratuito existente: checklist da mensagem de confirmação.\nOferta: teste do Agendei com configuração em uma chamada de 20 minutos.\nEvitar: inventar números, depoimentos ou resultados.",
        designKit: "# DESIGN KIT OFICIAL\nPaleta: verde-menta #3CC8A0 (destaques), grafite #1E2328 (títulos), branco #FFFFFF (fundo), apoio #F5F7F6.\nTipografia: sans pesada, títulos horizontais.\nIlustração: ícones lineares em grafite com detalhe menta, sem pessoas.",
      },
    });
    await window.pacto.request("saveMedia", { displayName: "Agendei", handle: "agendei.app", verified: true });
  });
  await page.reload();
  await page.getByRole("heading", { name: "O que vamos publicar hoje?" }).waitFor();

  // 1. Carrossel no estilo Tweet a partir da barra de criar (texto real pela conta).
  await page.getByRole("button", { name: /Estilo/ }).click();
  await page.getByRole("menuitemradio", { name: /^Tweet/ }).click();
  await page.getByRole("button", { name: /Tamanho/ }).click();
  await page.getByRole("menuitemradio", { name: /^4 cards/ }).click();
  await page.getByLabel("Tema ou ideia").fill("O que toda mensagem de confirmação de consulta precisa ter para o paciente não faltar");
  await page.getByRole("button", { name: "Criar carrossel" }).click();
  await page.getByRole("navigation", { name: "Etapas" }).waitFor();
  const carouselId = (await state(page)).projects[0].id;
  await idle(page, carouselId);
  let p = await project(page, carouselId);
  step("texto gerado", { cards: p.slides.length, titles: p.slides.map((s) => s.title), caption: p.caption.split("\n")[0], error: p.error });
  if (p.slides.length < 2) throw new Error(`Texto não gerado: ${p.error || p.messages.at(-1)?.text}`);
  await page.screenshot({ path: join(out, "01-texto-real.png") });
  for (const box of await page.getByRole("group", { name: /Revisão humana/ }).getByRole("checkbox").all()) await box.check();
  await page.getByRole("button", { name: "Aprovar e criar capas" }).click();
  await expect(page.locator(".cover-opt")).toHaveCount(3, { timeout: 60000 });
  await page.getByRole("button", { name: "Usar esta capa" }).click();
  await expect(page.getByRole("button", { name: "Ir para publicar" })).toBeVisible({ timeout: 60000 });
  p = await project(page, carouselId);
  step("tweet renderizado", { complete: p.slides.every((s) => s.image && s.state === "complete") });
  await page.screenshot({ path: join(out, "02-tweet-real.png") });
  for (const [i, s] of p.slides.entries()) await writeFile(join(out, `tweet-${i + 1}.png`), Buffer.from(s.image.split(",")[1], "base64"));

  // 2. CTA → DM e material gratuito em PDF (roteiro real).
  await page.getByRole("button", { name: "Ir para publicar" }).click();
  await page.getByRole("tab", { name: "Comentário e DM" }).click();
  await page.getByRole("button", { name: /Gerar palavras-chave/ }).click();
  await idle(page, carouselId);
  await expect(page.getByText("DM 1 · entrega")).toBeVisible({ timeout: 600000 });
  p = await project(page, carouselId);
  step("cta", { keyword: p.ctaKit?.keywords?.[0], freebie: p.ctaKit?.freebie });
  await page.screenshot({ path: join(out, "03-cta-real.png") });
  await page.getByRole("button", { name: "Criar PDF com a sua marca" }).click();
  await page.getByRole("navigation", { name: "Etapas" }).getByRole("button", { name: "Roteiro" }).waitFor();
  const materialId = (await state(page)).projects.find((x) => x.format === "material").id;
  await idle(page, materialId);
  let m = await project(page, materialId);
  step("material roteiro", { pages: m.slides.length, layouts: m.slides.map((s) => s.layout), titles: m.slides.map((s) => s.title), error: m.error });
  if (m.slides.length < 2) throw new Error(`Roteiro não gerado: ${m.error || m.messages.at(-1)?.text}`);
  await page.screenshot({ path: join(out, "04-material-roteiro-real.png") });
  await page.getByRole("button", { name: "Aprovar roteiro" }).click();
  await expect(page.locator(".cover-opt")).toHaveCount(3, { timeout: 60000 });
  await page.getByRole("button", { name: "Usar esta capa" }).click();
  await page.getByRole("button", { name: "Ir para exportar" }).click();
  await page.getByRole("button", { name: "Baixar PDF" }).click();
  m = await project(page, materialId);
  const pdfFile = join(out, `${m.title.replace(/[<>:"/\\|?*\x00-\x1f]/g, "").slice(0, 80)}.pdf`);
  await expect.poll(async () => (await stat(pdfFile).catch(() => null))?.size || 0, { timeout: 30000 }).toBeGreaterThan(1000);
  const pdf = (await readFile(pdfFile)).toString("latin1");
  step("material pdf", { file: pdfFile, pages: (pdf.match(/\/Type\s*\/Page[^s]/g) || []).length, expected: m.slides.length });
  await page.screenshot({ path: join(out, "05-material-exportar-real.png") });

  // 3. Cenas sugeridas pela IA, uma aprovada com foto gerada, e o estilo Texto + foto.
  await page.getByRole("button", { name: "Voltar ao início" }).click();
  await page.getByRole("button", { name: "Marca", exact: true }).click();
  await page.getByRole("button", { name: "Sugerir cenas" }).click();
  await free(page);
  let media = (await state(page)).media;
  step("cenas", { labels: media.scenes.map((s) => s.label) });
  await page.getByRole("button", { name: "Aprovar", exact: true }).first().click();
  await until(page, async () => { const s = await window.pacto.request("bootstrap"); return !s.working && s.media.scenes.some((x) => x.status === "approved" && x.image); }, null, 900000);
  media = (await state(page)).media;
  const scene = media.scenes.find((x) => x.image);
  await writeFile(join(out, "cena-gerada.png"), Buffer.from(scene.image.split(",")[1], "base64"));
  step("foto da cena", { label: scene.label });
  await page.screenshot({ path: join(out, "06-marca-cenas-real.png") });
  await page.getByRole("button", { name: "Início", exact: true }).click();
  await page.getByRole("button", { name: `Abrir ${p.title}`, exact: true }).click();
  await page.getByRole("navigation", { name: "Etapas" }).getByRole("button", { name: "Capa" }).click();
  await page.getByRole("group", { name: "Estilo do carrossel" }).getByRole("button", { name: "Texto + foto" }).click();
  await expect(page.locator(".cover-opt")).toHaveCount(3, { timeout: 60000 });
  await page.getByRole("button", { name: "Usar esta capa" }).click();
  await expect(page.getByRole("button", { name: "Ir para publicar" })).toBeVisible({ timeout: 60000 });
  await page.screenshot({ path: join(out, "07-texto-foto-real.png") });
  p = await project(page, carouselId);
  await writeFile(join(out, "texto-foto-capa.png"), Buffer.from(p.slides[0].image.split(",")[1], "base64"));

  // 4. Arte com IA: uma opção de capa gerada pela ferramenta nativa (economiza o limite).
  await page.getByRole("navigation", { name: "Etapas" }).getByRole("button", { name: "Capa" }).click();
  await page.evaluate(async (id) => {
    await window.pacto.request("saveProject", { id, style: "ia" });
    await window.pacto.request("generateCovers", { id, count: 1 });
  }, carouselId);
  await idle(page, carouselId);
  p = await project(page, carouselId);
  step("capa com IA", { options: p.coverOptions.length, error: p.error });
  if (p.coverOptions[0]) await writeFile(join(out, "capa-ia.png"), Buffer.from(p.coverOptions[0].image.split(",")[1], "base64"));
  await page.screenshot({ path: join(out, "08-capa-ia-real.png") });
  await writeFile(join(out, "log.json"), JSON.stringify(log, null, 2));
  console.log(JSON.stringify({ out, ok: true }));
} catch (error) {
  await writeFile(join(out, "log.json"), JSON.stringify([...log, { error: error.message }], null, 2));
  throw error;
} finally {
  if (application) await application.evaluate(({ app }) => app.exit(0)).catch(() => {});
  await server.close();
}

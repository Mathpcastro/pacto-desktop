import { copyFile, mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron } from "@playwright/test";
import { createServer } from "vite";

// Prova real das imagens no carrossel com a conta ChatGPT deste computador:
// logo nas Imagens da marca + tela do produto anexada na barra → o texto escolhe
// o card da imagem → capa e esse card gerados pela Arte com IA.
// As imagens de entrada são desenhadas aqui (logo e tela fictícia do Agendei).
// Uso: node scripts/images-proof.mjs [pasta-de-saída]
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] || join(root, ".cache", "images-proof"));
const niche = "C:/Users/Admin2/Documents/Obsidian Vault/Projetos/Carrosseis Que Vendem/Evidencias/nichos/saas";
await mkdir(out, { recursive: true });
const userData = await mkdtemp(join(tmpdir(), "carrossell-images-"));
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
const project = async (page, id) => (await page.evaluate(() => window.pacto.request("bootstrap"))).projects.find((p) => p.id === id);
const idle = (page, id, timeout = 1200000) =>
  until(page, async (id) => { const s = await window.pacto.request("bootstrap"); const p = s.projects.find((x) => x.id === id); return p && !["planning", "generating"].includes(p.status) && !s.working; }, id, timeout);
const save = (name, dataUrl) => writeFile(join(out, name), Buffer.from(dataUrl.split(",")[1], "base64"));
// Logo e uma tela de agenda desenhados no canvas: dados de teste, não fotos reais.
const draw = (page) =>
  page.evaluate(() => {
    const canvas = (w, h, paint) => { const c = document.createElement("canvas"); c.width = w; c.height = h; paint(c.getContext("2d")); return c.toDataURL("image/png"); };
    const logo = canvas(600, 600, (g) => {
      g.fillStyle = "#ffffff"; g.fillRect(0, 0, 600, 600);
      g.fillStyle = "#3cc8a0"; g.beginPath(); g.roundRect(150, 90, 300, 300, 70); g.fill();
      g.fillStyle = "#ffffff"; g.fillRect(205, 165, 190, 22); g.fillRect(205, 225, 190, 22); g.fillRect(205, 285, 120, 22);
      g.fillStyle = "#1e2328"; g.font = "bold 92px Segoe UI"; g.textAlign = "center"; g.fillText("Agendei", 300, 510);
    });
    const screen = canvas(780, 1500, (g) => {
      g.fillStyle = "#f5f7f6"; g.fillRect(0, 0, 780, 1500);
      g.fillStyle = "#3cc8a0"; g.fillRect(0, 0, 780, 190);
      g.fillStyle = "#ffffff"; g.font = "bold 58px Segoe UI"; g.fillText("Agenda de hoje", 50, 120);
      const rows = [["09:00", "Ana Souza", "Limpeza de pele", "Confirmado"], ["10:30", "Bruna Lima", "Drenagem", "Confirmado"], ["13:00", "Carla Dias", "Avaliação", "Aguardando"], ["15:00", "Duda Reis", "Massagem", "Confirmado"], ["16:30", "Eva Prado", "Retorno", "Aguardando"]];
      rows.forEach(([hora, nome, servico, status], i) => {
        const y = 240 + i * 240;
        g.fillStyle = "#ffffff"; g.beginPath(); g.roundRect(40, y, 700, 200, 28); g.fill();
        g.fillStyle = "#1e2328"; g.font = "bold 46px Segoe UI"; g.fillText(hora, 80, y + 80); g.fillText(nome, 260, y + 80);
        g.fillStyle = "#5b6670"; g.font = "38px Segoe UI"; g.fillText(servico, 260, y + 145);
        g.fillStyle = status === "Confirmado" ? "#1d8a5a" : "#c27a12"; g.font = "bold 32px Segoe UI"; g.fillText(status, 560, y + 145);
      });
    });
    return { logo, screen };
  });
let application;
try {
  await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}`;
  application = await _electron.launch({ args: ["."], cwd: root, env: { ...process.env, PACTO_USER_DATA: userData, PACTO_DEV_URL: url } });
  const page = await application.firstWindow();
  await page.setViewportSize({ width: 1366, height: 768 });
  await until(page, async () => Boolean((await window.pacto.request("bootstrap")).account?.connected), null, 120000);
  step("conta conectada");
  const [brandContext, designKit] = await Promise.all([readFile(join(niche, "contexto-da-marca.md"), "utf8"), readFile(join(niche, "design-kit.md"), "utf8")]);
  const { logo, screen } = await draw(page);
  await save("entrada-logo.png", logo);
  await save("entrada-tela-do-app.png", screen);
  const id = await page.evaluate(async ({ brandContext, designKit, logo, screen }) => {
    await window.pacto.request("saveProfile", { profile: { brand: "Agendei", brandContext, designKit } });
    await window.pacto.request("saveMedia", { displayName: "Agendei", handle: "agendei.app", addAssets: [{ name: "Logo Agendei", dataUrl: logo, kind: "logo" }] });
    const p = await window.pacto.request("createProject", {
      title: "A agenda do dia numa tela",
      brief: "Mostrar como fica a agenda do dia no Agendei: cada horário com nome, serviço e confirmação. Terminar com a oferta de 14 dias grátis. A imagem anexada é a tela real do app: quero que ela apareça no carrossel.",
      cardCount: 4,
      attachments: [{ name: "tela-do-app.png", dataUrl: screen }],
    });
    await window.pacto.request("generatePlan", { id: p.id });
    return p.id;
  }, { brandContext, designKit, logo, screen });
  await idle(page, id);
  let p = await project(page, id);
  if (p.slides.length < 2) throw new Error(`O texto não veio: ${p.error || p.messages.at(-1)?.text || "sem resposta"}`);
  const tela = p.attachments[0].id;
  step("texto gerado", { cards: p.slides.map((s) => ({ role: s.role, title: s.title, asset: s.asset === tela ? "tela-do-app.png" : s.asset })) });
  let target = p.slides.find((s) => s.asset === tela);
  if (!target) {
    step("o texto não escolheu um card para a tela; escolhida manualmente no último card");
    target = p.slides.at(-1);
    await page.evaluate(async ({ id, slides }) => window.pacto.request("saveProject", { id, slides }), { id, slides: p.slides.map((s) => (s.id === target.id ? { ...s, asset: tela } : s)) });
  }
  await page.evaluate(async (id) => { await window.pacto.request("approveText", { id }); await window.pacto.request("generateCovers", { id, count: 1 }); }, id);
  await idle(page, id);
  p = await project(page, id);
  await page.evaluate(async ({ id, option }) => window.pacto.request("chooseCover", { id, optionId: option }), { id, option: p.coverOptions[0].id });
  step("capa escolhida");
  await page.evaluate(async ({ id, slideId }) => window.pacto.request("generateSlides", { id, slideId }), { id, slideId: target.id });
  await idle(page, id);
  p = await project(page, id);
  const card = p.slides.find((s) => s.id === target.id);
  if (!card.image) throw new Error(p.error || "O card com a imagem não foi gerado.");
  await save("capa.png", p.slides[0].image);
  await save(`card-${card.index}-com-a-tela.png`, card.image);
  step("card com a imagem gerado", { card: card.index, title: card.title });
  await writeFile(join(out, "log.json"), JSON.stringify(log, null, 2));
} finally {
  if (application) await application.evaluate(({ app }) => app.exit(0)).catch(() => {});
  await server.close();
}

import { copyFile, mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron } from "@playwright/test";
import { createServer } from "vite";

// Prova real dos stories só de texto: carrossel no estilo Texto (montado pelo app) →
// stories escritos pela conta ChatGPT deste computador → PNGs 1080×1920 em fundo preto e branco.
// Uso: node scripts/stories-proof.mjs [pasta-de-saída]
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] || join(root, ".cache", "stories-proof"));
await mkdir(out, { recursive: true });
const userData = await mkdtemp(join(tmpdir(), "carrossell-stories-"));
await mkdir(join(userData, "codex"), { recursive: true });
await copyFile(join(process.env.CODEX_HOME || join(homedir(), ".codex"), "auth.json"), join(userData, "codex", "auth.json"));
const server = await createServer({ root, logLevel: "error", server: { host: "127.0.0.1", port: 0, strictPort: false } });
const step = (name, data = {}) => console.log(JSON.stringify({ name, ...data }));
async function until(page, predicate, arg, timeout) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await page.evaluate(predicate, arg).catch(() => false)) return;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error("Tempo esgotado aguardando o aplicativo.");
}
const project = (page, id) => page.evaluate(async (id) => (await window.pacto.request("bootstrap")).projects.find((p) => p.id === id), id);
const save = async (name, dataUrl) => writeFile(join(out, name), Buffer.from(dataUrl.split(",")[1], "base64"));
let application;
try {
  await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}`;
  application = await _electron.launch({ args: ["."], cwd: root, env: { ...process.env, PACTO_USER_DATA: userData, PACTO_DEV_URL: url } });
  const page = await application.firstWindow();
  await page.setViewportSize({ width: 1366, height: 768 });
  await until(page, async () => (await window.pacto.request("bootstrap")).account?.connected, null, 120000);
  step("conectado");
  const id = await page.evaluate(async () => {
    await window.pacto.request("saveProfile", {
      profile: {
        brand: "Agendei",
        brandContext:
          "# CONTEXTO OFICIAL DA MARCA\n## Agendei\nAgenda online com confirmação e lembretes automáticos por WhatsApp para clínicas pequenas de estética e fisioterapia (1 a 5 profissionais).\nPúblico: donas de clínica que perdem tempo confirmando consultas e sofrem com faltas.\nPromessa: menos tempo confirmando e menos horários vazios, sem prometer fim das faltas.\nTom: prático, direto e leve.\nMaterial gratuito existente: checklist da mensagem de confirmação.\nOferta: teste do Agendei com configuração em uma chamada de 20 minutos.\nEvitar: inventar números, depoimentos ou resultados.",
        designKit: "# DESIGN KIT OFICIAL\nPaleta: verde-menta #3CC8A0, grafite #1E2328, branco #FFFFFF.",
      },
    });
    await window.pacto.request("saveMedia", { displayName: "Agendei", handle: "agendei.app", verified: true });
    const s = await window.pacto.request("createProject", { title: "3 mensagens que reduzem faltas", brief: "Mensagens de confirmação para clínicas", style: "texto" });
    const p = s.projects ? s.projects[0] : s;
    await window.pacto.request("saveProject", {
      id: p.id,
      caption: "Comente CHECKLIST e eu te mando o modelo da mensagem.\nSalve para usar na segunda.",
      slides: [
        { id: "c1", title: "3 mensagens que fazem a paciente aparecer", body: "Comente CHECKLIST" },
        { id: "c2", title: "Confirme 24 h antes, não no dia", body: "No dia, quem esqueceu já marcou outra coisa. Na véspera ainda dá para remarcar." },
        { id: "c3", title: "Dê duas opções de resposta", body: "\"Responda 1 para confirmar ou 2 para remarcar\" recebe mais resposta que \"Confirma?\"." },
        { id: "c4", title: "Lembre 2 h antes com o endereço", body: "Mande o link do mapa junto. Quem chega atrasada costuma desistir." },
        { id: "c5", title: "Quer o modelo pronto?", body: "Comente CHECKLIST que eu te mando as 3 mensagens para copiar." },
      ],
    });
    await window.pacto.request("approveText", { id: p.id });
    return p.id;
  });
  // Estilo Texto: capa e cards são montados pelo app, sem IA.
  await page.evaluate(async (id) => window.pacto.request("generateCovers", { id }), id);
  await until(page, async (id) => { const s = await window.pacto.request("bootstrap"); return s.projects.find((x) => x.id === id).coverOptions?.length && !s.working; }, id, 120000);
  await page.evaluate(async (id) => { const s = await window.pacto.request("bootstrap"); const p = s.projects.find((x) => x.id === id); return window.pacto.request("chooseCover", { id, optionId: p.coverOptions[0].id }); }, id);
  await until(page, async (id) => { const s = await window.pacto.request("bootstrap"); const p = s.projects.find((x) => x.id === id); return p.slides.every((x) => x.image) && !s.working; }, id, 120000);
  step("carrossel montado", { cards: (await project(page, id)).slides.length });
  await page.evaluate(async (id) => window.pacto.request("ctaKit", { id }).catch((e) => String(e)), id);
  step("kit de CTA", { keyword: (await project(page, id)).ctaKit?.keywords?.[0] || "" });
  await page.evaluate(async (id) => window.pacto.request("stories", { id }), id);
  await until(page, async (id) => { const s = await window.pacto.request("bootstrap"); const p = s.projects.find((x) => x.id === id); return p.stories?.length && p.stories.every((x) => x.image) && !s.working; }, id, 600000);
  let p = await project(page, id);
  step("stories", { stories: p.stories.map(({ type, text, sticker, cta, art }) => ({ type, text, sticker, cta, art })) });
  for (const [i, s] of p.stories.entries()) await save(`preto-${String(i + 1).padStart(2, "0")}.png`, s.image);
  await page.evaluate(async (id) => window.pacto.request("storyTheme", { id, theme: "branco" }), id);
  p = await project(page, id);
  for (const [i, s] of p.stories.entries()) await save(`branco-${String(i + 1).padStart(2, "0")}.png`, s.image);
  step("tema branco", { theme: p.storyTheme });
  // Tela real: abre o carrossel, vai para Publicar › Stories.
  await page.screenshot({ path: join(out, "tela-inicio.png") });
  await page.getByText("3 mensagens que reduzem faltas").first().click();
  await page.getByRole("tab", { name: "Enviar" }).click();
  await page.screenshot({ path: join(out, "tela-enviar.png") });
  await page.getByRole("tab", { name: "Stories" }).click();
  await page.screenshot({ path: join(out, "tela-stories.png") });
  step("telas", { out });
} finally {
  await application?.close().catch(() => {});
  await server.close().catch(() => {});
}

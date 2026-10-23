import { copyFile, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron } from "@playwright/test";
import { createServer } from "vite";

// Real onboarding through the production preload/runtime and the existing ChatGPT
// login of this computer (copied into a temporary private home, then deleted).
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] || join(root, ".cache", "onboarding-proof"));
await mkdir(out, { recursive: true });
const userData = await mkdtemp(join(tmpdir(), "pacto-onboarding-proof-"));
await mkdir(join(userData, "codex"), { recursive: true });
await copyFile(
  join(process.env.CODEX_HOME || join(homedir(), ".codex"), "auth.json"),
  join(userData, "codex", "auth.json"),
);
const server = await createServer({
  root,
  server: { host: "127.0.0.1", port: 0, strictPort: false },
});
const log = [];
const step = (name, data = {}) => {
  log.push({ name, at: new Date().toISOString(), ...data });
  console.log(JSON.stringify({ name, ...data }));
};
// page.waitForFunction treats a pending promise as truthy, so poll from Node.
async function until(page, predicate, arg, timeout) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await page.evaluate(predicate, arg).catch(() => false)) return;
    await new Promise((r) => setTimeout(r, 2500));
  }
  throw new Error("Tempo esgotado aguardando o aplicativo.");
}
let application;
const answers = {
  brand: [
    "A marca se chama Ateliê Barro Vivo. Vendo um curso online de cerâmica para iniciantes, chamado Primeira Peça, por R$197, com 12 aulas gravadas e lista de materiais. O público são adultos de 25 a 45 anos, iniciantes, que querem um hobby manual para desestressar e acham que cerâmica exige forno caro e estúdio.",
    "Dores: não sabem por onde começar, acham caro, têm medo de errar e desperdiçar argila, não têm espaço em casa. Desejos: fazer a primeira peça bonita em casa, ter um hobby relaxante, presentear amigos. Transformação: sair do zero e fazer peças utilitárias com argila de secagem ao ar, sem forno. Diferencial: método sem forno, materiais baratos, aulas curtas.",
    "Tenho 8 anos de ateliê e dou oficinas presenciais. Posso entregar grátis: lista de materiais com preços, guia de 5 erros de iniciante e um checklist da primeira peça. Tom: acolhedor, simples, um pouco bem-humorado, nada agressivo. Não posso prometer renda nem dizer que é profissionalizante. Não quero falar de política.",
  ],
  design: [
    "Cores da marca: terracota (#C8643B), creme (#F4EADB), verde-oliva (#6B7445) e marrom escuro para textos. Quero carrosséis ilustrados, com desenhos em estilo aquarela/guache com textura de papel, mãos modelando argila, peças de cerâmica e um pouco de humor. Sensação acolhedora, artesanal, calma.",
    "Evitar: fotos de banco, neon, visual corporativo, excesso de texto, gradientes digitais. Pouco texto por card, título grande em serifada calorosa. Capa com cena ilustrada forte e o título na parte de cima. Pode ter uma mascote: uma tigelinha de barro sorridente.",
  ],
};
try {
  await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}`;
  application = await _electron.launch({
    args: ["."],
    cwd: root,
    env: { ...process.env, PACTO_USER_DATA: userData, PACTO_DEV_URL: url },
  });
  const page = await application.firstWindow();
  await page.setViewportSize({ width: 1440, height: 940 }).catch(() => {});
  await page.getByRole("heading", { name: "Seu projeto, montado com você." }).waitFor();
  await until(page, 
    async () => (await window.pacto.request("bootstrap")).account?.connected,
    null, 120000);
  step("connected");
  await page.screenshot({ path: join(out, "01-inicio.png") });
  const heading = (name) => page.getByRole("heading", { name }).waitFor({ timeout: 30000 });
  // The first screen may still be the account step when the login loaded late.
  if (await page.getByRole("button", { name: "Continuar" }).isVisible().catch(() => false))
    await page.getByRole("button", { name: "Continuar" }).click();
  for (const kind of ["brand", "design"]) {
    const title = kind === "brand" ? "Contexto Oficial da Marca" : "Design Kit Oficial";
    await heading(title);
    if (kind === "design") {
      await page.getByRole("button", { name: /^Ilustrado/ }).click();
      await page.screenshot({ path: join(out, "03-design-inicio.png") });
    }
    await page.getByRole("button", { name: /Começar entrevista/ }).click();
    const waitTurn = async (count) => {
      await until(page, 
        async ({ kind, count }) => {
          const s = await window.pacto.request("bootstrap");
          return !s.interviewing && (s.onboarding[kind].messages.filter((m) => m.role === "assistant").length >= count || s.onboarding[kind].document);
        },
        { kind, count }, 600000);
    };
    await waitTurn(1);
    step(`${kind}-round-1`);
    if (kind === "brand") await page.screenshot({ path: join(out, "02-entrevista-marca.png") });
    for (const [index, text] of answers[kind].entries()) {
      const state = await page.evaluate(() => window.pacto.request("bootstrap"));
      if (state.onboarding[kind].document) break;
      await page.getByLabel("Sua resposta").fill(text);
      await page.getByRole("button", { name: "Enviar resposta" }).click();
      await waitTurn(index + 2);
      step(`${kind}-answer-${index + 1}`);
    }
    let state = await page.evaluate(() => window.pacto.request("bootstrap"));
    if (!state.onboarding[kind].document) {
      await page.getByRole("button", { name: "Gerar o documento agora" }).click();
      await until(page, 
        async (kind) => (await window.pacto.request("bootstrap")).onboarding[kind].document,
        kind, 600000);
      state = await page.evaluate(() => window.pacto.request("bootstrap"));
    }
    await writeFile(join(out, `${kind}-documento.md`), state.onboarding[kind].document);
    await writeFile(join(out, `${kind}-conversa.json`), JSON.stringify(state.onboarding[kind].messages, null, 2));
    step(`${kind}-document`, { chars: state.onboarding[kind].document.length, rounds: state.onboarding[kind].messages.length });
    await page.locator(".document-text").waitFor();
    await page.screenshot({ path: join(out, kind === "brand" ? "02b-contexto-revisao.png" : "04-design-kit-revisao.png") });
    await page.getByRole("button", { name: "Aprovar e continuar" }).click();
  }
  await heading("Seu projeto está instalado.");
  await page.screenshot({ path: join(out, "05-instalado.png") });
  await page.getByRole("button", { name: "Entrar no estúdio" }).click();
  await page.getByRole("button", { name: /Biblioteca/ }).waitFor();
  step("profile-saved");
  await page.keyboard.press("Control+n");
  await page.getByLabel("Nome do carrossel").fill("5 erros de quem começa na cerâmica");
  await page.getByLabel(/Sobre o que é/).fill("Os 5 erros mais comuns de quem faz a primeira peça de cerâmica em casa, e como evitar cada um. Entregar o guia gratuito dos 5 erros por DM.");
  await page.getByRole("radio", { name: "Salvamentos" }).click();
  await page.getByRole("radio", { name: /^Lista Útil/ }).click();
  await page.screenshot({ path: join(out, "06-novo-carrossel.png") });
  await page.getByRole("button", { name: "Abrir no estúdio" }).click();
  const project = await page.evaluate(async () => (await window.pacto.request("bootstrap")).projects[0]);
  step("project", { architectureId: project.architectureId, goal: project.goal });
  await page.evaluate((id) => window.pacto.request("generatePlan", { id }), project.id);
  await until(page, 
    async (id) => { const p = (await window.pacto.request("bootstrap")).projects.find((x) => x.id === id); return !["planning"].includes(p.status) && (p.slides.length || p.status === "error" || p.messages.length); },
    project.id, 900000);
  let planned = await page.evaluate(async (id) => (await window.pacto.request("bootstrap")).projects.find((x) => x.id === id), project.id);
  step("plan", { status: planned.status, slides: planned.slides.length, architecture: planned.architecture, error: planned.error });
  await writeFile(join(out, "plano.json"), JSON.stringify({ title: planned.title, architecture: planned.architecture, caption: planned.caption, slides: planned.slides }, null, 2));
  if (planned.slides.length) {
    await page.evaluate(({ id, slideId }) => window.pacto.request("generateSlides", { id, slideId }), { id: project.id, slideId: planned.slides[0].id });
    await until(page, 
      async (id) => { const p = (await window.pacto.request("bootstrap")).projects.find((x) => x.id === id); return p.status !== "generating"; },
      project.id, 900000);
    planned = await page.evaluate(async (id) => (await window.pacto.request("bootstrap")).projects.find((x) => x.id === id), project.id);
    const cover = planned.slides[0].image;
    step("cover", { generated: Boolean(cover), error: planned.error });
    if (cover) await writeFile(join(out, "07-capa-gerada.png"), Buffer.from(cover.split(",")[1], "base64"));
    await page.screenshot({ path: join(out, "08-estudio.png") });
  }
} catch (error) {
  const page = application && (await application.firstWindow().catch(() => null));
  const ui = page && (await page.evaluate(async () => ({ state: await window.pacto.request("bootstrap").then((s) => ({ interviewing: s.interviewing, connected: s.account.connected, brand: s.onboarding.brand.messages.length, design: s.onboarding.design.messages.length })), working: !!document.querySelector(".assistant-working"), error: document.querySelector(".error-banner")?.textContent || "" })).catch(() => null));
  if (page) await page.screenshot({ path: join(out, "falha.png") }).catch(() => {});
  step("failed", { error: error.message.split(String.fromCharCode(10))[0], ui });
  process.exitCode = 1;
} finally {
  await writeFile(join(out, "log.json"), JSON.stringify(log, null, 2));
  await application?.close().catch(() => {});
  await server.close();
  await rm(userData, { recursive: true, force: true });
}

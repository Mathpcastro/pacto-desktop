import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron } from "@playwright/test";
import { createServer } from "vite";

// Visual check of the course-flow screens with hand-authored local data. No
// inference runs here: texts below are fixtures and the art is a real image
// from an earlier proof, passed as argv[3].
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] || join(root, ".cache", "flow-screens"));
const art = process.argv[3] ? `data:image/png;base64,${(await readFile(process.argv[3])).toString("base64")}` : null;
await mkdir(out, { recursive: true });
const userData = await mkdtemp(join(tmpdir(), "pacto-flow-screens-"));
await mkdir(join(userData, "library", "images"), { recursive: true });
const now = new Date().toISOString();
const slides = [
  ["Capa", "5 erros na primeira peça de argila", "Salve antes de abrir o pacote.", "5 erros"],
  ["Segundo hook — contraste", "Não é falta de talento", "Quase sempre é argila seca demais ou água demais.", "argila seca"],
  ["Item 1", "Pacote aberto o tempo todo", "Separe uma porção e feche o resto na hora.", "feche o resto"],
  ["CTA final", "Quer o guia dos 5 erros?", "Comente GUIA que eu te mando o checklist completo.", "GUIA"],
].map(([role, title, body, emphasis], i) => ({ id: `s${i + 1}`, index: i + 1, role, title, body, emphasis, visual: "Tigelinha mascote reagindo ao erro, aquarela", prompt: "" }));
const base = { brief: "Fixture visual", architectureId: "lista-util", goal: "Salvamentos", editorialLine: "Direto, acolhedor, com humor leve", visualConcept: "Mascote tigelinha de barro sorridente em todos os cards", caption: "Comente GUIA para receber o checklist.\nSalve para consultar na primeira peça.", architecture: "Lista Útil", messages: [], createdAt: now, updatedAt: now, ctaKit: null, results: null };
const data = {
  profile: { brand: "Fixture visual", brandContext: "# CONTEXTO", designKit: "# KIT", designPreset: "ilustrado", references: [] },
  onboarding: { brand: { messages: [], document: "", brandName: "" }, design: { messages: [], document: "", brandName: "" } },
  ideas: [{ id: "batch1", source: "radar", title: "Fixture do Radar", analysis: "Texto de exemplo para conferir o layout.", createdAt: now, ideas: Array.from({ length: 6 }, (_, i) => ({ id: `i${i}`, theme: `Tema de exemplo ${i + 1}`, hook: `Hook de exemplo número ${i + 1}`, why: "Motivo de exemplo", deliverable: "Entrega de exemplo", connection: "Curso", architecture: ["Lista Útil", "Tutorial", "Framework"][i % 3], group: "Radar", top: i < 3, reason: "Razão de exemplo" })) }],
  projects: [
    { ...base, id: "p-text", title: "Etapa texto", status: "ready", textApproved: false, coverOptions: [], slides },
    { ...base, id: "p-cover", title: "Etapa capa", status: "ready", textApproved: true, coverOptions: art ? [1, 2, 3].map((n) => ({ id: `c${n}`, file: "x.png", image: art, createdAt: now })) : [], slides },
    { ...base, id: "p-slides", title: "Etapa carrossel", status: "ready", textApproved: true, coverOptions: [], ctaKit: { keywords: ["GUIA", "ERROS", "ARGILA"], firstCardCta: "Salve antes de começar", lastCardCta: "Quer o guia? Comente GUIA", freebie: "Checklist dos 5 erros (precisa ser preparado)", dm1: "Aqui está o checklist que prometi.", dm2: "Se quiser fazer sua primeira peça com acompanhamento, o curso Primeira Peça..." }, slides: slides.map((s) => (art ? { ...s, image: art, state: "complete", versions: [] } : s)) },
    { ...base, id: "p-win", title: "Vencedor de exemplo", status: "complete", textApproved: true, coverOptions: [], publishedAt: new Date(Date.now() - 6 * 864e5).toISOString(), results: { comments: 120, saves: 340, sales: 3, recordedAt: now }, slides: slides.map((s) => (art ? { ...s, image: art, state: "complete", versions: [] } : s)) },
    { ...base, id: "p-mid", title: "Mediano de exemplo", status: "complete", textApproved: true, coverOptions: [], publishedAt: new Date(Date.now() - 8 * 864e5).toISOString(), results: { comments: 6, saves: 14, sales: 0, recordedAt: now }, slides: slides.map((s) => (art ? { ...s, image: art, state: "complete", versions: [] } : s)) },
    { ...base, id: "p-wait", title: "Esperando resultado", status: "complete", textApproved: true, coverOptions: [], publishedAt: new Date(Date.now() - 3 * 864e5).toISOString(), slides: slides.map((s) => (art ? { ...s, image: art, state: "complete", versions: [] } : s)) },
  ],
};
// "empty" mode: a brand-new buyer right after onboarding, with Radar results and no carousel yet.
if (process.argv[4] === "empty") data.projects = [];
await writeFile(join(userData, "library", "state.json"), JSON.stringify(data));
const server = await createServer({ root, server: { host: "127.0.0.1", port: 0, strictPort: false } });
let application;
const checks = [];
try {
  await server.listen();
  application = await _electron.launch({ args: ["."], cwd: root, env: { ...process.env, PACTO_USER_DATA: userData, PACTO_DEV_URL: `http://127.0.0.1:${server.httpServer.address().port}` } });
  const page = await application.firstWindow();
  await page.setViewportSize({ width: 1440, height: 940 }).catch(() => {});
  const shot = (name) => page.screenshot({ path: join(out, `${name}.png`) });
  if (process.argv[4] === "empty") {
    await page.getByRole("heading", { name: "Comece por uma destas pautas." }).waitFor();
    await page.waitForTimeout(800);
    await shot("11-biblioteca-oportunidades");
    checks.push({ opportunities: await page.locator(".opportunities .idea-card").count() });
    console.log(JSON.stringify({ completed: true, checks }));
    process.exit(0);
  }
  await page.waitForTimeout(800);
  await shot("12-biblioteca-com-faixa");
  checks.push({ strip: await page.locator(".opportunity-strip .idea-card").count(), badge: await page.locator(".nav-badge").textContent() });
  await page.getByRole("button", { name: /Ritmo/ }).click();
  await page.getByRole("heading", { name: /carrosséis publicados/ }).waitFor();
  await page.waitForTimeout(600);
  await shot("13-ritmo");
  checks.push({ pending: await page.locator(".pending-list li").count(), above: await page.locator(".winners tr.above").count() });
  await page.getByRole("button", { name: "Aumentar meta" }).click();
  await page.locator(".goal-stepper strong", { hasText: "6" }).waitFor({ timeout: 10000 }).catch(() => {});
  checks.push({ goalAfterClick: await page.locator(".goal-stepper strong").textContent() });
  await page.locator(".rhythm").evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await shot("13b-ritmo-vencedores");
  await page.getByRole("button", { name: /Pautas/ }).click();
  await page.getByRole("heading", { name: "Fixture do Radar" }).waitFor();
  await page.waitForTimeout(800);
  await shot("01-pautas");
  checks.push({ lessonLinksPautas: await page.locator(".lesson-link").allTextContents() });
  await page.getByRole("checkbox", { name: /Top 10/ }).check();
  checks.push({ topFilter: await page.locator(".idea-card").count() });
  await page.locator(".idea-card").first().getByRole("button", { name: /Criar carrossel/ }).click();
  checks.push({ prefilledTitle: await page.getByLabel("Nome do carrossel").inputValue() });
  await shot("02-criar-da-pauta");
  await page.getByRole("button", { name: "Cancelar" }).click();
  await page.getByRole("button", { name: /Biblioteca/ }).click();
  for (const [name, title] of [["03-texto", "Etapa texto"], ["04-capa", "Etapa capa"], ["05-carrossel", "Etapa carrossel"]]) {
    await page.getByRole("button", { name: `Abrir ${title}`, exact: true }).click();
    await page.waitForTimeout(600);
    await shot(name);
    checks.push({ [`lessonLinks-${name}`]: await page.locator(".lesson-link").allTextContents() });
    if (name === "03-texto") {
      const approve = page.getByRole("button", { name: /Aprovar texto/ });
      checks.push({ approveDisabledBeforeChecklist: await approve.isDisabled() });
      for (const box of await page.locator(".review-checklist input").all()) await box.check();
      checks.push({ approveEnabledAfterChecklist: await approve.isEnabled() });
      await page.locator(".copy-board").evaluate((el) => el.scrollTo(0, el.scrollHeight));
      await shot("03b-texto-revisao");
    }
    if (name === "05-carrossel") {
      // Every card has art: the publish screen comes first, with the first-carousel celebration.
      checks.push({ celebration: await page.getByText("SEU PRIMEIRO CARROSSEL QUE VENDE").isVisible() });
      await page.getByRole("button", { name: "Enviar para o celular" }).click();
      await page.locator(".share-qr").waitFor({ timeout: 15000 });
      const url = await page.locator(".share-url").textContent();
      const phone = await fetch(url).then(async (r) => ({ status: r.status, saveButton: (await r.text()).includes("Salvar todas no celular") }));
      const image = await fetch(`${url}f/0`).then((r) => ({ status: r.status, type: r.headers.get("content-type") }));
      checks.push({ shareUrl: url.replace(/\/[\w-]{32}\//, "/<token>/"), phone, image });
      await shot("08-celular");
      await page.getByRole("button", { name: "Concluir" }).click();
      await page.waitForTimeout(300);
      checks.push({ shareStoppedOnClose: await fetch(url).then(() => false).catch(() => true) });
      await page.getByRole("button", { name: "Salvar no Google Drive" }).click();
      await page.getByRole("button", { name: /Escolher outra pasta/ }).waitFor();
      await page.waitForTimeout(500);
      await shot("09-drive");
      await page.getByRole("button", { name: "Concluir" }).click();
      await page.getByRole("button", { name: /Stories de perguntas/ }).click();
      await shot("10-stories");
      await page.getByRole("button", { name: "Fechar", exact: true }).click();
      await page.getByRole("button", { name: /Ajustar os cards/ }).click();
      // Correction needs a connected account; offline it must stay disabled.
      checks.push({ fixDisabledOffline: await page.getByRole("button", { name: "Corrigir" }).isDisabled() });
      await page.locator("summary[aria-label=\"Mais ações do projeto\"]").click();
      await page.getByRole("button", { name: /CTA, DM e oferta/ }).click();
      await shot("07-cta");
      await page.getByRole("button", { name: "Fechar", exact: true }).click();
    }
    await page.getByRole("button", { name: "Voltar para a biblioteca" }).click();
  }
  console.log(JSON.stringify({ completed: true, checks }));
} catch (error) {
  console.log(JSON.stringify({ completed: false, error: error.message.split(String.fromCharCode(10))[0], checks }));
  process.exitCode = 1;
} finally {
  await application?.close().catch(() => {});
  await server.close();
  await rm(userData, { recursive: true, force: true }).catch(() => {});
}

import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron } from "@playwright/test";
import { createServer } from "vite";

// Real course flow through the production preload/runtime: Radar → pauta → texto
// aprovado → opções de capa → restante → correção → CTA/DM → exportação.
// Usage: node scripts/flow-proof.mjs <out> <brand-context.md> <design-kit.md>
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const [outArg, brandFile, designFile] = process.argv.slice(2);
const out = resolve(outArg || join(root, ".cache", "flow-proof"));
await mkdir(out, { recursive: true });
const userData = await mkdtemp(join(tmpdir(), "pacto-flow-proof-"));
await mkdir(join(userData, "codex"), { recursive: true });
await copyFile(join(process.env.CODEX_HOME || join(homedir(), ".codex"), "auth.json"), join(userData, "codex", "auth.json"));
const server = await createServer({ root, server: { host: "127.0.0.1", port: 0, strictPort: false } });
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
    await new Promise((r) => setTimeout(r, 3000));
  }
  throw new Error("Tempo esgotado aguardando o aplicativo.");
}
const project = (page, id) => page.evaluate(async (id) => (await window.pacto.request("bootstrap")).projects.find((p) => p.id === id), id);
const idle = (page, id, timeout = 1200000) => until(page, async (id) => { const p = (await window.pacto.request("bootstrap")).projects.find((x) => x.id === id); return !["planning", "generating"].includes(p.status); }, id, timeout);
let application;
try {
  await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}`;
  application = await _electron.launch({ args: ["."], cwd: root, env: { ...process.env, PACTO_USER_DATA: userData, PACTO_DEV_URL: url } });
  const page = await application.firstWindow();
  await page.setViewportSize({ width: 1440, height: 940 }).catch(() => {});
  await until(page, async () => (await window.pacto.request("bootstrap")).account?.connected, null, 120000);
  step("connected");
  await page.evaluate(async ({ brandContext, designKit }) => {
    await window.pacto.request("saveProfile", { profile: { brand: "Ateliê Barro Vivo", brandContext, designKit, designPreset: "ilustrado", references: [] } });
  }, { brandContext: await readFile(brandFile, "utf8"), designKit: await readFile(designFile, "utf8") });
  await page.reload();
  await page.getByRole("button", { name: /Pautas/ }).click();
  await page.getByLabel(/Foco desta rodada/).fill("erros e dúvidas de quem faz a primeira peça em casa");
  await page.getByRole("button", { name: "Gerar 30 pautas" }).click();
  await until(page, async () => { const s = await window.pacto.request("bootstrap"); return !s.working && s.ideas.length; }, null, 600000);
  let state = await page.evaluate(() => window.pacto.request("bootstrap"));
  const batch = state.ideas[0];
  step("radar", { ideas: batch.ideas.length, top: batch.ideas.filter((i) => i.top).length });
  await writeFile(join(out, "radar.json"), JSON.stringify(batch, null, 2));
  await page.screenshot({ path: join(out, "01-radar.png") });
  await page.getByRole("tab", { name: "Modelador de Referências" }).click();
  await page.getByLabel("Referência que performou bem").fill("Carrossel de uma ceramista: '3 ferramentas de cozinha que substituem kit de cerâmica'. Capa com foto de garfo, palito e esponja sobre argila. Muitos salvamentos e comentários pedindo a lista.");
  await page.getByRole("button", { name: "Modelar sem copiar" }).click();
  await until(page, async () => { const s = await window.pacto.request("bootstrap"); return !s.working && s.ideas.length >= 2; }, null, 600000);
  state = await page.evaluate(() => window.pacto.request("bootstrap"));
  step("modelador", { ideas: state.ideas[0].ideas.length, analysis: state.ideas[0].analysis.slice(0, 160) });
  await writeFile(join(out, "modelador.json"), JSON.stringify(state.ideas[0], null, 2));
  await page.screenshot({ path: join(out, "02-modelador.png") });
  // Create from the first Top 10 radar idea.
  await page.getByRole("checkbox", { name: /Top 10/ }).check();
  await page.locator(".idea-card.top").first().getByRole("button", { name: /Criar carrossel/ }).click();
  await page.getByRole("radio", { name: "Salvamentos" }).click();
  await page.screenshot({ path: join(out, "03-novo-da-pauta.png") });
  await page.getByRole("button", { name: "Abrir no estúdio" }).click();
  state = await page.evaluate(() => window.pacto.request("bootstrap"));
  const id = state.projects[0].id;
  step("project", { title: state.projects[0].title, architectureId: state.projects[0].architectureId });
  await page.getByRole("button", { name: "Gerar o texto do carrossel" }).click();
  await idle(page, id, 900000);
  let p = await project(page, id);
  step("text", { status: p.status, slides: p.slides.length, error: p.error, editorialLine: p.editorialLine, visualConcept: p.visualConcept });
  await writeFile(join(out, "texto.json"), JSON.stringify({ title: p.title, architecture: p.architecture, editorialLine: p.editorialLine, visualConcept: p.visualConcept, caption: p.caption, review: p.messages.at(-1)?.text, slides: p.slides.map(({ role, title, body, emphasis, visual }) => ({ role, title, body, emphasis, visual })) }, null, 2));
  await page.screenshot({ path: join(out, "04-texto.png") });
  for (const box of await page.locator(".review-checklist input").all()) await box.check();
  await page.getByRole("button", { name: /Aprovar texto e criar a capa/ }).click();
  await page.getByRole("heading", { name: "Escolha a capa que faria você parar." }).waitFor();
  await page.getByRole("button", { name: "Gerar opções de capa" }).click();
  await idle(page, id);
  p = await project(page, id);
  step("covers", { options: p.coverOptions.length, error: p.error });
  for (const [i, o] of p.coverOptions.entries()) await writeFile(join(out, `05-capa-opcao-${i + 1}.png`), Buffer.from(o.image.split(",")[1], "base64"));
  await page.screenshot({ path: join(out, "05-capas.png") });
  // PROOF_UNTIL=covers stops after the cover options to save account usage.
  if (process.env.PROOF_UNTIL === "covers") throw Object.assign(new Error("stop"), { stop: true });
  await page.getByRole("button", { name: "Usar esta capa" }).nth(Math.min(1, p.coverOptions.length - 1)).click();
  await page.getByRole("button", { name: /Gerar restantes|Gerar imagens/ }).waitFor();
  await page.getByRole("button", { name: /Gerar restantes|Gerar imagens/ }).click();
  await idle(page, id, 2400000);
  p = await project(page, id);
  step("slides", { images: p.slides.filter((s) => s.image).length, total: p.slides.length, status: p.status, error: p.error });
  for (const [i, s] of p.slides.entries()) if (s.image) await writeFile(join(out, `06-card-${String(i + 1).padStart(2, "0")}.png`), Buffer.from(s.image.split(",")[1], "base64"));
  await page.screenshot({ path: join(out, "06-estudio.png") });
  // Quick visual correction on card 2.
  await page.getByRole("button", { name: /Slide 2:/ }).click();
  await page.getByRole("button", { name: "Corrigir" }).click();
  await page.getByRole("button", { name: "Título pequeno" }).click();
  await page.getByRole("button", { name: "Corrigir este card" }).click();
  await idle(page, id);
  p = await project(page, id);
  step("fix", { versions: p.slides[1].versions?.length, error: p.error });
  await writeFile(join(out, "07-card-02-corrigido.png"), Buffer.from(p.slides[1].image.split(",")[1], "base64"));
  await page.evaluate((id) => window.pacto.request("ctaKit", { id }), id);
  p = await project(page, id);
  step("cta", { keywords: p.ctaKit?.keywords?.slice(0, 5) });
  await writeFile(join(out, "cta.json"), JSON.stringify(p.ctaKit, null, 2));
  const zip = await page.evaluate(async (id) => {
    const p = (await window.pacto.request("bootstrap")).projects.find((x) => x.id === id);
    return p.slides.every((s) => s.image && s.state !== "outdated");
  }, id);
  step("export-ready", { ready: zip });
} catch (error) {
  if (error.stop) step("stopped-after-covers");
  else step("failed",{ error: error.message.split(String.fromCharCode(10))[0] });
  process.exitCode = 1;
} finally {
  await writeFile(join(out, "log.json"), JSON.stringify(log, null, 2));
  await application?.close().catch(() => {});
  await server.close();
  await rm(userData, { recursive: true, force: true }).catch(() => {});
}

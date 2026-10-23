import { execFileSync } from "node:child_process";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron } from "@playwright/test";
import { createServer } from "vite";

// Robustez: app fechado no meio da geração, login ausente, Codex encerrado e
// tela pequena (1366×768 com 125% ≈ 1093×580 úteis). Usage:
// node scripts/robustness-proof.mjs <out> <art.png>
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] || join(root, ".cache", "robustness"));
const art = `data:image/png;base64,${(await readFile(process.argv[3])).toString("base64")}`;
await mkdir(out, { recursive: true });
const server = await createServer({ root, server: { host: "127.0.0.1", port: 0, strictPort: false } });
await server.listen();
const url = `http://127.0.0.1:${server.httpServer.address().port}`;
const report = {};
const temps = [];
const now = new Date().toISOString();
const cards = ["Capa", "Segundo hook", "Item 1", "CTA final"].map((role, i) => ({ id: `s${i + 1}`, index: i + 1, role, title: `Título do card ${i + 1} com algumas palavras`, body: "Texto final de exemplo para conferir o espaço do card na tela.", emphasis: "", visual: "Cena", prompt: "" }));
const base = { brief: "Fixture de robustez", architectureId: "tutorial", goal: "", cardCount: 4, editorialLine: "Direta", visualConcept: "Mascote", caption: "Comente GUIA\nSalve para depois.", architecture: "Tutorial", messages: [], createdAt: now, updatedAt: now, ctaKit: null, results: null, publishedAt: "", stories: [] };
const fixture = (projects) => ({
  profile: { brand: "Robustez", brandContext: "# CONTEXTO OFICIAL DA MARCA\nNegócio de teste.", designKit: "# DESIGN KIT\nIlustrado.", designPreset: "ilustrado", references: [] },
  onboarding: { brand: { messages: [], document: "", brandName: "" }, design: { messages: [], document: "", brandName: "" } },
  ideas: [], settings: { weeklyGoal: 5, driveFolder: "", firstCompletedAt: now, lastReminderAt: "" }, projects,
});
async function userData({ auth = false, state = null } = {}) {
  const dir = await mkdtemp(join(tmpdir(), "pacto-robust-")); temps.push(dir);
  await mkdir(join(dir, "library", "images"), { recursive: true });
  if (state) await writeFile(join(dir, "library", "state.json"), JSON.stringify(state));
  if (auth) { await mkdir(join(dir, "codex"), { recursive: true }); await copyFile(join(process.env.CODEX_HOME || join(homedir(), ".codex"), "auth.json"), join(dir, "codex", "auth.json")); }
  return dir;
}
const launch = (dir, extra = []) => _electron.launch({ args: [".", ...extra], cwd: root, env: { ...process.env, PACTO_USER_DATA: dir, PACTO_DEV_URL: url } });
const bootstrap = (page) => page.evaluate(() => window.pacto.request("bootstrap"));
async function until(page, predicate, timeout) {
  const end = Date.now() + timeout;
  while (Date.now() < end) { if (await page.evaluate(predicate).catch(() => false)) return true; await new Promise((r) => setTimeout(r, 1500)); }
  return false;
}
// Codex may run a few levels below the process Playwright sees: walk the whole tree.
const descendants = (pid) => {
  const all = JSON.parse(execFileSync("powershell", ["-NoProfile", "-Command", "Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,Name | ConvertTo-Json -Compress"], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }));
  const found = [], queue = [pid];
  while (queue.length) { const parent = queue.shift(); for (const p of all) if (p.ParentProcessId === parent) { found.push(p); queue.push(p.ProcessId); } }
  return found;
};
async function step(name, run) {
  if (process.env.STEPS && !process.env.STEPS.split(",").includes(name)) return;
  try { report[name] = { ok: true, ...(await run()) }; } catch (error) { report[name] = { ok: false, error: error.message.split("\n")[0] }; }
  console.log(JSON.stringify({ [name]: report[name] }));
}
try {
  await step("loginAusente", async () => {
    const dir = await userData({ state: fixture([{ ...base, id: "p1", title: "Sem login", status: "draft", textApproved: false, coverOptions: [], slides: [] }]) });
    const app = await launch(dir); const page = await app.firstWindow();
    await page.locator(".account-menu summary").getByText("Conectar conta").waitFor({ timeout: 30000 });
    const error = await page.evaluate(() => window.pacto.request("generatePlan", { id: "p1" }).then(() => "sem erro", (e) => e.message));
    await page.getByRole("button", { name: "Abrir Sem login", exact: true }).click();
    await page.getByRole("button", { name: "Gerar o texto do carrossel" }).waitFor();
    const disabled = await page.getByRole("button", { name: "Gerar o texto do carrossel" }).isDisabled();
    await page.screenshot({ path: join(out, "01-sem-login.png") });
    await app.close();
    return { error, generateDisabled: disabled, passed: /Conecte sua conta/.test(error) && disabled };
  });
  await step("appFechadoNaGeracao", async () => {
    const dir = await userData({ auth: true, state: fixture([{ ...base, id: "p2", title: "Interrompido", status: "draft", textApproved: false, coverOptions: [], slides: [] }]) });
    let app = await launch(dir); let page = await app.firstWindow();
    await until(page, async () => (await window.pacto.request("bootstrap")).account?.connected, 120000);
    await page.evaluate(() => window.pacto.request("generatePlan", { id: "p2" }));
    const during = (await bootstrap(page)).projects[0].status;
    await new Promise((r) => setTimeout(r, 4000));
    execFileSync("taskkill", ["/PID", String(app.process().pid), "/T", "/F"], { stdio: "ignore" });
    await new Promise((r) => setTimeout(r, 1500));
    app = await launch(dir); page = await app.firstWindow();
    await page.getByRole("button", { name: "Abrir Interrompido", exact: true }).waitFor({ timeout: 30000 });
    const after = (await bootstrap(page)).projects[0];
    await page.getByRole("button", { name: "Abrir Interrompido", exact: true }).click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: join(out, "02-reaberto-apos-fechar.png") });
    await app.close();
    return { during, after: after.status, message: after.error, passed: during === "planning" && after.status === "draft" && /interrompida/.test(after.error || "") };
  });
  await step("codexEncerrado", async () => {
    const dir = await userData({ auth: true, state: fixture([]) });
    const app = await launch(dir); const page = await app.firstWindow();
    await until(page, async () => (await window.pacto.request("bootstrap")).account?.connected, 120000);
    const codex = descendants(app.process().pid).filter((p) => /^codex/i.test(p.Name));
    if (!codex.length) throw new Error("Processo do Codex não encontrado.");
    for (const p of codex) execFileSync("taskkill", ["/PID", String(p.ProcessId), "/T", "/F"], { stdio: "ignore" });
    const dropped = await until(page, async () => !(await window.pacto.request("bootstrap")).account?.connected, 20000);
    await page.screenshot({ path: join(out, "03-codex-encerrado.png") });
    const responsive = Array.isArray((await bootstrap(page)).projects);
    // With the private login still on disk, "Conectar" restarts Codex without a new sign-in window.
    await page.evaluate(() => window.pacto.request("connect").catch(() => {}));
    const back = await until(page, async () => (await window.pacto.request("bootstrap")).account?.connected, 60000);
    const windows = app.windows().length;
    await app.close();
    return { killed: codex.length, dropped, responsive, reconnected: back, extraWindows: windows - 1, passed: dropped && responsive && back && windows === 1 };
  });
  await step("telaPequena125", async () => {
    const done = cards.map((c) => ({ ...c, image: art, state: "complete", versions: [] }));
    const dir = await userData({ state: fixture([
      { ...base, id: "t", title: "Texto", status: "ready", textApproved: false, coverOptions: [], slides: cards },
      { ...base, id: "c", title: "Capa", status: "ready", textApproved: true, coverOptions: [1, 2, 3].map((n) => ({ id: `c${n}`, file: "x", image: art, createdAt: now })), slides: cards },
      { ...base, id: "d", title: "Publicar", status: "complete", textApproved: true, coverOptions: [], slides: done },
    ]) });
    const app = await launch(dir, ["--force-device-scale-factor=1.25"]); const page = await app.firstWindow();
    await page.setViewportSize({ width: 1093, height: 580 });
    const views = {};
    const measure = async (name, action) => {
      await page.waitForTimeout(700);
      const box = action ? await page.getByRole("button", { name: action }).first().evaluate((el) => { el.scrollIntoView({ block: "nearest" }); const r = el.getBoundingClientRect(); return { top: Math.round(r.top), bottom: Math.round(r.bottom) }; }) : null;
      const overflowX = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      await page.screenshot({ path: join(out, `04-pequena-${name}.png`) });
      views[name] = { overflowX, action: box && { ...box, visible: box.top >= 0 && box.bottom <= 580 } };
    };
    await measure("biblioteca", /Novo carrossel/);
    await page.getByRole("button", { name: /Pautas/ }).click(); await measure("pautas", /Gerar 30 pautas/);
    await page.getByRole("button", { name: /Ritmo/ }).click(); await measure("ritmo", /Aumentar meta/);
    await page.getByRole("button", { name: /Biblioteca/ }).click();
    await page.getByRole("button", { name: /Novo carrossel/ }).click(); await measure("novo-carrossel", /Abrir no estúdio/);
    await page.getByRole("button", { name: "Cancelar" }).click();
    for (const [name, title, action] of [["texto", "Texto", /Aprovar texto/], ["capa", "Capa", /Usar esta capa/], ["publicar", "Publicar", /Enviar para o celular/]]) {
      await page.getByRole("button", { name: `Abrir ${title}`, exact: true }).click();
      await measure(name, action);
      await page.getByRole("button", { name: "Voltar para a biblioteca" }).click();
    }
    await app.close();
    const failing = Object.entries(views).filter(([, v]) => v.overflowX > 0 || (v.action && !v.action.visible)).map(([k]) => k);
    return { views, failing, passed: !failing.length };
  });
  await step("lembreteWindows", async () => {
    const old = new Date(Date.now() - 4 * 864e5).toISOString();
    const dir = await userData({ state: fixture([{ ...base, id: "w", title: "Esperando número", status: "complete", textApproved: true, coverOptions: [], publishedAt: old, slides: cards.map((c) => ({ ...c, image: art, state: "complete", versions: [] })) }]) });
    const app = await launch(dir); const page = await app.firstWindow();
    const fired = await until(page, async () => Boolean((await window.pacto.request("bootstrap")).settings.lastReminderAt), 15000);
    const badge = await page.locator(".nav-badge").textContent().catch(() => null);
    await app.close();
    return { notificationShown: fired, badge, passed: fired && badge === "1" };
  });
} finally {
  await writeFile(join(out, process.env.STEPS ? "report-rerun.json" : "report.json"), JSON.stringify(report, null, 2));
  await server.close();
  for (const dir of temps) await rm(dir, { recursive: true, force: true }).catch(() => {});
}

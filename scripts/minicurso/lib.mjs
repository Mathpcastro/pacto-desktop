import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { homedir, tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron } from "@playwright/test";
import { createServer } from "vite";

// Gravador do minicurso: conduz o app pela interface com um cursor visível,
// grava quadros da própria janela (capturePage) com horário e marca o início de
// cada trecho do roteiro. Playwright recordVideo trava o Electron e a captura GDI
// grava preto, por isso os quadros vêm da janela.
export const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");
export const VAULT = "C:/Users/Admin2/Documents/Obsidian Vault/Projetos/PACTO Desktop";
export const NICHES = join(VAULT, "Evidencias", "nichos");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Cursor e clique desenhados no DOM: aparecem na captura e somem fora dela.
const CURSOR_SCRIPT = () => {
  const install = () => {
    if (document.getElementById("rec-cursor")) return;
    const style = document.createElement("style");
    style.textContent = `#rec-cursor{position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;transition:transform .55s cubic-bezier(.3,.7,.2,1);transform:translate(720px,470px)}#rec-cursor svg{filter:drop-shadow(0 2px 3px #0005)}.rec-ripple{position:fixed;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:3px solid #bb512f;z-index:2147483646;pointer-events:none;animation:rec-r .5s ease-out forwards}@keyframes rec-r{from{opacity:.9;transform:scale(.4)}to{opacity:0;transform:scale(1.6)}}`;
    const el = document.createElement("div");
    el.id = "rec-cursor";
    el.innerHTML = '<svg width="26" height="26" viewBox="0 0 26 26"><path d="M3 2 L3 21 L8.5 16 L12 24 L15.5 22.5 L12 14.8 L19.5 14.8 Z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.documentElement.append(style, el);
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", install); else install();
  window.__recMove = (x, y) => { install(); document.getElementById("rec-cursor").style.transform = `translate(${x - 3}px,${y - 2}px)`; };
  window.__recRipple = (x, y) => { const r = document.createElement("div"); r.className = "rec-ripple"; r.style.left = `${x}px`; r.style.top = `${y}px`; document.documentElement.append(r); setTimeout(() => r.remove(), 600); };
};

export async function writeState(userData, state) {
  await mkdir(join(userData, "library", "images"), { recursive: true });
  await writeFile(join(userData, "library", "state.json"), JSON.stringify(state));
}
export const dataUrl = async (file) => `data:image/png;base64,${(await readFile(file)).toString("base64")}`;
// Um carrossel pronto montado com os cards reais gerados na prova de cada nicho.
export async function nicheProject(slug, extra = {}) {
  const meta = JSON.parse(await readFile(join(NICHES, slug, "carrossel.json"), "utf8"));
  const now = new Date().toISOString();
  const slides = await Promise.all(meta.slides.map(async (s, i) => ({ id: `${slug}-${i + 1}`, index: i + 1, role: s.role, title: s.title, body: s.body, emphasis: s.emphasis, visual: s.visual, prompt: "", image: await dataUrl(join(NICHES, slug, `card-${String(i + 1).padStart(2, "0")}.png`)), state: "complete", versions: [] })));
  return { id: `p-${slug}`, title: meta.title, brief: meta.title, architectureId: "", goal: "", cardCount: slides.length, editorialLine: meta.editorialLine || "", visualConcept: meta.visualConcept || "", textApproved: true, coverOptions: [], ctaKit: meta.ctaKit || null, stories: meta.stories || [], results: null, publishedAt: "", status: "complete", slides, caption: meta.caption || "", architecture: meta.architecture || "", coverHooks: meta.coverHooks || [], messages: [], createdAt: now, updatedAt: now, ...extra };
}
export async function nicheProfile(slug, brand) {
  return { brand, brandContext: await readFile(join(NICHES, slug, "contexto-da-marca.md"), "utf8"), designKit: await readFile(join(NICHES, slug, "design-kit.md"), "utf8"), designPreset: "", references: [] };
}
export const emptyOnboarding = () => ({ brand: { messages: [], document: "", brandName: "" }, design: { messages: [], document: "", brandName: "" } });

export class Recorder {
  constructor(lessonId) { this.lessonId = lessonId; this.dir = join(ROOT, ".cache", "minicurso", lessonId); this.marks = []; this.takes = []; this.temps = []; }
  async init() { await mkdir(this.dir, { recursive: true }); this.server = await createServer({ root: ROOT, server: { host: "127.0.0.1", port: 0, strictPort: false }, logLevel: "error" }); await this.server.listen(); return this; }
  async userData({ auth = false, state = null } = {}) {
    const dir = await mkdtemp(join(tmpdir(), `pacto-${this.lessonId}-`)); this.temps.push(dir);
    if (state) await writeState(dir, state);
    if (auth) { await mkdir(join(dir, "codex"), { recursive: true }); await copyFile(join(process.env.CODEX_HOME || join(homedir(), ".codex"), "auth.json"), join(dir, "codex", "auth.json")); }
    return dir;
  }
  // Abre o app; cada abertura é uma "tomada" com seus próprios quadros.
  async open(userData) {
    this.app = await _electron.launch({ args: ["."], cwd: ROOT, env: { ...process.env, PACTO_USER_DATA: userData, PACTO_DEV_URL: `http://127.0.0.1:${this.server.httpServer.address().port}` } });
    this.page = await this.app.firstWindow();
    await this.page.addInitScript(CURSOR_SCRIPT);
    await this.page.evaluate(CURSOR_SCRIPT);
    await this.page.waitForLoadState("domcontentloaded");
    await sleep(1200);
    // Pin capture to the main window: card rendering opens hidden windows too.
    this.mainId = await this.app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].id);
    if (!this.framed) { this.framed = true; await this.lessonCards(); }
    const take = { id: this.takes.length + 1, frames: [], dir: join(this.dir, `take-${this.takes.length + 1}`) };
    await rm(take.dir, { recursive: true, force: true }); await mkdir(take.dir, { recursive: true });
    this.takes.push(take); this.take = take; take.running = true; take.t0 = Date.now();
    take.loop = (async () => {
      while (take.running) {
        const started = Date.now();
        const jpeg = await this.app.evaluate(async ({ BrowserWindow }, id) => { const w = BrowserWindow.fromId(id); return w ? (await w.webContents.capturePage()).toJPEG(88).toString("base64") : null; }, this.mainId).catch(() => null);
        if (jpeg) { const name = `${String(take.frames.length).padStart(6, "0")}.jpg`; await writeFile(join(take.dir, name), Buffer.from(jpeg, "base64")); take.frames.push({ name, t: (started - take.t0) / 1000 }); }
        await sleep(Math.max(0, 90 - (Date.now() - started)));
      }
    })();
    return this.page;
  }
  now() { return (Date.now() - this.take.t0) / 1000; }
  mark(id) { this.marks.push({ id, source: "rec", take: this.take.id, start: this.now() }); }
  image(id, file) { this.marks.push({ id, source: "image", file }); }
  clip(id, file, ranges) { this.marks.push({ id, source: "clip", file, ranges }); }
  async close() {
    const take = this.take; if (!take) return;
    const last = this.marks.filter((m) => m.take === take.id).at(-1); if (last && last.end === undefined) last.end = this.now();
    take.running = false; await take.loop; await this.app.close().catch(() => {}); this.take = null;
    // Quadros com horário viram vídeo de 30 fps preservando o tempo real.
    const list = take.frames.map((f, i) => `file '${f.name}'\nduration ${((take.frames[i + 1]?.t ?? f.t + 0.1) - f.t).toFixed(3)}`).join("\n") + `\nfile '${take.frames.at(-1).name}'\n`;
    await writeFile(join(take.dir, "list.txt"), list);
    execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-f", "concat", "-safe", "0", "-i", join(take.dir, "list.txt"), "-vf", "fps=30,pad=ceil(iw/2)*2:ceil(ih/2)*2", "-c:v", "libx264", "-preset", "veryfast", "-crf", "16", "-pix_fmt", "yuv420p", join(this.dir, `take-${take.id}.mp4`)]);
    await rm(take.dir, { recursive: true, force: true });
  }
  // Ends the previous mark when the next one starts inside the same take.
  endMarks() { for (let i = 0; i < this.marks.length; i++) { const m = this.marks[i]; if (m.source !== "rec" || m.end !== undefined) continue; const next = this.marks.slice(i + 1).find((n) => n.source === "rec" && n.take === m.take); if (next) m.end = next.start; } }
  async finish() {
    if (this.take) await this.close();
    this.endMarks();
    await writeFile(join(this.dir, "beats.json"), JSON.stringify(this.marks.map((m) => (m.source === "rec" ? { ...m, file: join(this.dir, `take-${m.take}.mp4`) } : m)), null, 2));
    await this.server.close();
    for (const d of this.temps) await rm(d, { recursive: true, force: true }).catch(() => {});
  }
  // Movimentos humanos: o cursor vai até o elemento, espera, clica.
  async point(locator, pause = 450) {
    await locator.scrollIntoViewIfNeeded().catch(() => {});
    const box = await locator.boundingBox();
    if (!box) return;
    await this.page.evaluate(([x, y]) => window.__recMove?.(x, y), [box.x + box.width / 2, box.y + box.height / 2]);
    await sleep(650 + pause);
  }
  async click(locator, pause = 350) {
    await this.point(locator, pause);
    const box = await locator.boundingBox();
    if (box) await this.page.evaluate(([x, y]) => window.__recRipple?.(x, y), [box.x + box.width / 2, box.y + box.height / 2]);
    await locator.click(); await sleep(500);
  }
  async type(locator, text, delay = 28) { await this.click(locator); await locator.pressSequentially(text, { delay }); await sleep(400); }
  async wait(ms) { await sleep(ms); }
  async until(predicate, arg, timeout = 600000) {
    const end = Date.now() + timeout;
    while (Date.now() < end) {
      const ok = await Promise.race([this.page.evaluate(predicate, arg).catch(() => false), sleep(15000).then(() => false)]);
      if (ok) return; await sleep(2000);
    }
    throw new Error("Tempo esgotado aguardando o app.");
  }
  // Abertura, fechamento e moldura da aula, a partir do roteiro.
  async lessonCards() {
    const data = JSON.parse(await readFile(join(ROOT, "docs", "minicurso", "roteiros.json"), "utf8"));
    const i = data.lessons.findIndex((l) => l.id === this.lessonId), lesson = data.lessons[i], next = data.lessons[i + 1];
    const n = String(lesson.number).padStart(2, "0");
    const letter = lesson.letter === "PACTO" ? "" : lesson.letter === "AC" ? "A·C" : lesson.letter;
    await this.card("abertura", cardHtml({ eyebrow: `PACTO EM 19 MINUTOS · AULA ${n}`, title: lesson.title.replace(/ · /, " · <em>").replace(/$/, lesson.title.includes(" · ") ? "</em>" : ""), subtitle: `Base no curso: ${lesson.sources.join(", ")}`, letter }));
    await this.card("fim", cardHtml({ eyebrow: next ? `PRÓXIMA · AULA ${String(next.number).padStart(2, "0")}` : "FIM DO MINICURSO", title: next ? next.title : "Agora é com você. <em>Publique hoje.</em>", letter }));
    for (const fast of [false, true]) await this.card(fast ? "moldura-acelerado" : "moldura", frameHtml({ label: `Aula ${n} · ${lesson.title}`, letter, fast }));
  }
  // Cartelas: HTML renderizado numa janela fora da tela e salvo como PNG 1920×1080.
  async card(name, html) {
    const file = join(this.dir, `${name}.png`);
    const b64 = await this.app.evaluate(async ({ BrowserWindow }, html) => {
      const w = new BrowserWindow({ show: false, width: 1920, height: 1080, useContentSize: true, webPreferences: { offscreen: true } });
      await w.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
      await new Promise((r) => setTimeout(r, 400));
      const img = await w.webContents.capturePage(); w.destroy();
      return img.resize({ width: 1920, height: 1080 }).toPNG().toString("base64");
    }, html);
    await writeFile(file, Buffer.from(b64, "base64"));
    return file;
  }
}

// Visual das cartelas, com a identidade da interface do PACTO (não a do comprador).
export const cardHtml = ({ eyebrow, title, subtitle = "", items = [], letter = "" }) => `<!doctype html><html><head><meta charset="utf-8"><style>
html{overflow:hidden}body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#f5f3ee;color:#242522;font-family:"Segoe UI",sans-serif;display:flex;align-items:center;justify-content:center}
main{width:1500px}.eye{font:600 22px Consolas,monospace;letter-spacing:6px;color:#bb512f}
h1{font:normal 104px/1.05 Georgia,serif;letter-spacing:-3px;margin:28px 0 22px}h1 em{color:#bb512f}
p{font-size:32px;line-height:1.5;color:#74756e;max-width:1200px;margin:0}
ul{list-style:none;padding:0;margin:48px 0 0;display:grid;grid-template-columns:repeat(${Math.min(5, Math.max(1, items.length))},1fr);gap:22px}
li{background:#fcfbf8;border:2px solid #deded6;border-radius:10px;padding:26px 24px}li b{display:block;font:normal 64px Georgia,serif;color:#bb512f}li span{font-size:24px;line-height:1.35;color:#242522}
.letter{position:absolute;right:90px;top:70px;font:normal 160px Georgia,serif;color:#bb512f;opacity:.18}
.mark{position:absolute;left:90px;bottom:60px;font:600 30px Georgia,serif}.mark small{display:block;font:600 14px Consolas,monospace;letter-spacing:4px;color:#74756e}
</style></head><body>${letter ? `<div class="letter">${letter}</div>` : ""}<main><div class="eye">${eyebrow}</div><h1>${title}</h1>${subtitle ? `<p>${subtitle}</p>` : ""}${items.length ? `<ul>${items.map((i) => `<li><b>${i[0]}</b><span>${i[1]}</span></li>`).join("")}</ul>` : ""}</main><div class="mark">pacto<small>ESTÚDIO DE CARROSSÉIS</small></div><script>document.documentElement.style.zoom = innerWidth / 1920;</script></body></html>`;

// Moldura 1920×1080: barra superior com a aula; a janela do app entra embaixo.
export const frameHtml = ({ label, letter, fast }) => `<!doctype html><html><head><meta charset="utf-8"><style>
html{overflow:hidden}body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#e9e8e1;font-family:"Segoe UI",sans-serif}
header{height:66px;display:flex;align-items:center;gap:22px;padding:0 40px;background:#242522;color:#f5f3ee}
.badge{font:normal 30px Georgia,serif;color:#e48b68;min-width:20px}.label{font-size:21px;letter-spacing:.3px}
.fast{margin-left:auto;font:600 15px Consolas,monospace;letter-spacing:3px;background:#bb512f;color:#fff;padding:7px 14px;border-radius:999px}
.brand{margin-left:${fast ? "22px" : "auto"};font:600 20px Georgia,serif;color:#f5f3ee}
</style></head><body><header>${letter ? `<span class="badge">${letter}</span>` : ""}<span class="label">${label}</span>${fast ? '<span class="fast">▶▶ ACELERADO</span>' : ""}<span class="brand">pacto</span></header><script>document.documentElement.style.zoom = innerWidth / 1920;</script></body></html>`;

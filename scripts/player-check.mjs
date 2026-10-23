import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron } from "@playwright/test";
import { createServer } from "vite";

// Confere que as aulas tocam dentro do app: abre a aula pela lista do método e por
// um "Ver na aula", e lê o estado do player do YouTube no iframe. Com --packaged
// usa o executável (página file://), onde o YouTube costuma exigir Referer.
// Usage: node scripts/player-check.mjs <out> [--packaged]
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] || join(root, ".cache", "player-check"));
const packaged = process.argv.includes("--packaged");
await mkdir(out, { recursive: true });
const userData = await mkdtemp(join(tmpdir(), "pacto-player-"));
await mkdir(join(userData, "library", "images"), { recursive: true });
await writeFile(join(userData, "library", "state.json"), JSON.stringify({ profile: { brand: "Player", brandContext: "c", designKit: "k", designPreset: "", references: [] }, projects: [], ideas: [] }));
let server, app;
const report = { packaged };
try {
  let env = { ...process.env, PACTO_USER_DATA: userData };
  if (!packaged) {
    server = await createServer({ root, server: { host: "127.0.0.1", port: 0, strictPort: false } });
    await server.listen();
    env.PACTO_DEV_URL = `http://127.0.0.1:${server.httpServer.address().port}`;
  }
  app = packaged ? await _electron.launch({ executablePath: join(root, "release", "win-unpacked", "PACTO.exe"), env }) : await _electron.launch({ args: ["."], cwd: root, env });
  const page = await app.firstWindow();
  await page.setViewportSize({ width: 1440, height: 940 }).catch(() => {});
  const playerState = async () => {
    await page.locator(".lesson-frame iframe").waitFor({ timeout: 20000 });
    const src = await page.locator(".lesson-frame iframe").getAttribute("src");
    let text = "", video = false;
    for (let i = 0; i < 20; i++) {
      await page.waitForTimeout(1000);
      const frame = page.frames().find((f) => f.url().includes("youtube-nocookie.com/embed"));
      if (!frame) continue;
      text = (await frame.evaluate(() => document.body?.innerText || "").catch(() => "")).slice(0, 300);
      video = await frame.evaluate(() => Boolean(document.querySelector("video"))).catch(() => false);
      if (video || /erro|error|indispon|unavailable/i.test(text)) break;
    }
    return { src, videoElement: video, error: /erro|error|indispon|unavailable|153/i.test(text) ? text.replace(/\s+/g, " ") : "" };
  };
  await page.getByRole("button", { name: /O método/ }).click();
  await page.locator(".course-list button").nth(1).click();
  report.fromMethodList = await playerState();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: join(out, `${packaged ? "pacote" : "dev"}-player-aula.png`) });
  await page.getByRole("button", { name: "Voltar ao estúdio" }).click();
  await page.getByRole("button", { name: /Pautas/ }).click();
  await page.locator(".lesson-link").first().click();
  report.fromLessonLink = await playerState();
  report.markButtons = await page.locator(".lesson-marks button").count();
  await page.screenshot({ path: join(out, `${packaged ? "pacote" : "dev"}-player-trecho.png`) });
  report.passed = [report.fromMethodList, report.fromLessonLink].every((r) => r.videoElement && !r.error) && /start=\d+/.test(report.fromLessonLink.src);
} catch (error) {
  report.error = error.message.split("\n")[0];
} finally {
  console.log(JSON.stringify(report));
  await writeFile(join(out, `${packaged ? "pacote" : "dev"}-report.json`), JSON.stringify(report, null, 2));
  await app?.close().catch(() => {});
  await server?.close();
  await rm(userData, { recursive: true, force: true }).catch(() => {});
}

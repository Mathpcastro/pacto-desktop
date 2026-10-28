import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron } from "playwright";

// Prova do aviso de atualização do Mac (modo manual), no app empacotado do Windows com
// PACTO_MANUAL_UPDATE=1: um servidor local anuncia uma versão maior em latest.yml; o app
// mostra "Baixar" e o clique abre o .dmg do chip certo. Nada é baixado nem instalado.
// Uso: node scripts/mac-update-proof.mjs [--skip-build]
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, ".cache", "mac-update-proof");
await mkdir(out, { recursive: true });
const current = JSON.parse(await readFile(join(root, "package.json"), "utf8")).version;
const next = current.replace(/(\d+)$/, (n) => String(Number(n) + 1));
if (!process.argv.includes("--skip-build")) execFileSync(process.execPath, [join(root, "node_modules", "electron-builder", "cli.js"), "--win", "dir", "--publish", "never"], { cwd: root, stdio: "inherit" });
const requests = [];
const server = createServer((req, res) => {
  requests.push(req.url);
  if (req.url === "/latest.yml") { res.writeHead(200); res.end(`version: ${next}\nfiles:\n  - url: Carrossell-Setup-${next}.exe\n`); }
  else { res.writeHead(404); res.end(); }
});
await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
const base = `http://127.0.0.1:${server.address().port}/`;
let app;
try {
  const userData = await mkdtemp(join(tmpdir(), "pacto-mac-update-"));
  app = await _electron.launch({ executablePath: join(root, "release", "win-unpacked", "Carrossell.exe"), env: { ...process.env, PACTO_USER_DATA: userData, PACTO_UPDATE_URL: base, PACTO_MANUAL_UPDATE: "1" } });
  const page = await app.firstWindow();
  await app.evaluate(({ shell }) => { globalThis.__opened = []; shell.openExternal = async (url) => { globalThis.__opened.push(url); }; });
  const banner = page.getByRole("status").filter({ hasText: `A versão ${next} do Carrossell está disponível` });
  await banner.waitFor({ timeout: 60000 });
  await page.screenshot({ path: join(out, "aviso.png") });
  await banner.getByRole("button", { name: "Baixar" }).click();
  await page.waitForTimeout(800);
  const opened = await app.evaluate(() => globalThis.__opened);
  const expected = `${base}Carrossell-Mac-${process.arch === "arm64" ? "AppleSilicon" : "Intel"}.dmg`;
  if (opened.length !== 1 || opened[0] !== expected) throw new Error(`Link aberto inesperado: ${JSON.stringify(opened)}`);
  const result = { current, announced: next, opened: opened[0], requests };
  await writeFile(join(out, "resultado.json"), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  if (app) await app.close().catch(() => {});
  server.close();
}

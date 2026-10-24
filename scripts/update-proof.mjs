import { execFileSync } from "node:child_process";
import { cp, mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron } from "playwright";

// Prova da atualização automática: gera o instalador de uma versão maior, serve
// localmente e abre o app empacotado na versão atual apontando para esse servidor.
// Passa quando o app encontra, baixa e mostra "Reiniciar e atualizar" sozinho.
// Nada é instalado: o teste para antes de clicar no botão.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const pkgFile = join(root, "package.json");
const original = await readFile(pkgFile, "utf8");
const current = JSON.parse(original).version;
const next = current.replace(/(\d+)$/, (n) => String(Number(n) + 1));
const builder = (args) => execFileSync(process.execPath, [join(root, "node_modules", "electron-builder", "cli.js"), ...args], { cwd: root, stdio: "inherit" });
const feed = await mkdtemp(join(tmpdir(), "pacto-feed-"));
let server, app;
try {
  await writeFile(pkgFile, original.replace(`"version": "${current}"`, `"version": "${next}"`));
  builder(["--win", "nsis", "--publish", "never"]);
  for (const name of ["latest.yml", `Carrossell-Setup-${next}.exe`, `Carrossell-Setup-${next}.exe.blockmap`]) await cp(join(root, "release", name), join(feed, name));
  // O app-update.yml só sai no build do instalador; é ele que leva o endereço de produção.
  const updateConfig = await readFile(join(root, "release", "win-unpacked", "resources", "app-update.yml"), "utf8");
  console.log(JSON.stringify({ appUpdateYml: updateConfig.trim() }));
  await writeFile(pkgFile, original);
  builder(["--win", "dir", "--publish", "never"]);
  await writeFile(join(root, "release", "win-unpacked", "resources", "app-update.yml"), updateConfig);

  server = createServer(async (req, res) => {
    try { const body = await readFile(join(feed, decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/+/, ""))); res.writeHead(200, { "Content-Length": body.length }); res.end(body); }
    catch { res.writeHead(404); res.end(); }
  });
  await new Promise((ok) => server.listen(0, "127.0.0.1", ok));
  const userData = await mkdtemp(join(tmpdir(), "pacto-update-user-"));
  await mkdir(userData, { recursive: true });
  app = await _electron.launch({ executablePath: join(root, "release", "win-unpacked", "Carrossell.exe"), env: { ...process.env, PACTO_USER_DATA: userData, PACTO_UPDATE_URL: `http://127.0.0.1:${server.address().port}/` } });
  const page = await app.firstWindow();
  const started = Date.now();
  await page.locator(".update-banner").waitFor({ timeout: 300000 });
  const text = (await page.locator(".update-banner").innerText()).replace(/\s+/g, " ");
  console.log(JSON.stringify({ from: current, to: next, seconds: Math.round((Date.now() - started) / 1000), banner: text, button: await page.getByRole("button", { name: "Reiniciar e atualizar" }).isVisible() }));
} finally {
  // Encerrar sem "quit": com autoInstallOnAppQuit, fechar normalmente instalaria a versão de teste.
  // No Windows, kill() deixa os processos filhos vivos; taskkill /T encerra a árvore inteira.
  const pid = app?.process().pid;
  if (pid) try { execFileSync("taskkill", ["/F", "/T", "/PID", String(pid)], { stdio: "ignore" }); } catch {}
  server?.close();
  await rm(join(process.env.LOCALAPPDATA || tmpdir(), "pacto-desktop-updater"), { recursive: true, force: true });
  await writeFile(pkgFile, original);
  await rm(feed, { recursive: true, force: true });
}

import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron } from "@playwright/test";
import { createServer } from "vite";

// Captura a janela inteira pelo sistema (Windows), com a barra de título e os botões
// de janela, que não aparecem no print da página. Tema claro e escuro, Início e estúdio.
// Uso: node scripts/window-shot.mjs [pasta-de-saída]
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] || join(root, ".cache", "window-shot"));
await mkdir(out, { recursive: true });
const userData = await mkdtemp(join(tmpdir(), "carrossell-window-"));
const server = await createServer({ root, logLevel: "error", server: { host: "127.0.0.1", port: 0, strictPort: false } });
const grab = (bounds, file) =>
  execFileSync("powershell", ["-NoProfile", "-Command", `Add-Type -AssemblyName System.Drawing; $b=New-Object System.Drawing.Bitmap ${bounds.width},${bounds.height}; $g=[System.Drawing.Graphics]::FromImage($b); $g.CopyFromScreen(${bounds.x},${bounds.y},0,0,$b.Size); $b.Save('${file.replace(/'/g, "''")}'); $g.Dispose(); $b.Dispose()`]);
let app;
try {
  await server.listen();
  app = await _electron.launch({ args: ["."], cwd: root, env: { ...process.env, PACTO_USER_DATA: userData, PACTO_DEV_URL: `http://127.0.0.1:${server.httpServer.address().port}` } });
  const page = await app.firstWindow();
  await page.waitForLoadState("domcontentloaded");
  await page.evaluate(async () => {
    await window.pacto.request("saveProfile", { profile: { brand: "Agendei", brandContext: "# CONTEXTO\nAgenda online para clínicas.", designKit: "# DESIGN KIT\nVerde-menta #3CC8A0 destaques; grafite #1E2328 títulos; branco #FFFFFF fundo" } });
    const p = await window.pacto.request("createProject", { title: "4 informações que toda confirmação precisa ter", brief: "Teste" });
    await window.pacto.request("saveProject", { id: p.id, slides: [{ id: "a", role: "Capa", title: "4 informações que toda confirmação precisa ter" }, { id: "b", role: "Passo", title: "Qual dia? Que horas?", body: "Data e horário completos." }] });
  });
  await page.reload();
  await page.getByRole("heading", { name: "O que vamos publicar hoje?" }).waitFor();
  const bounds = async () => {
    await app.evaluate(({ BrowserWindow }) => { const w = BrowserWindow.getAllWindows()[0]; w.setBounds({ x: 40, y: 40, width: 1366, height: 768 }); w.show(); w.focus(); w.moveTop(); });
    await page.waitForTimeout(900);
    return app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].getBounds());
  };
  grab(await bounds(), join(out, "1-inicio-claro.png"));
  await page.getByRole("button", { name: /Abrir 4 informações/ }).click();
  await page.waitForTimeout(800);
  grab(await bounds(), join(out, "2-estudio-claro.png"));
  await page.evaluate(() => { localStorage.setItem("carrossell-preferences", JSON.stringify({ theme: "dark", palette: "carrossell", scale: 100 })); });
  await page.reload();
  await page.getByRole("heading", { name: "O que vamos publicar hoje?" }).waitFor();
  grab(await bounds(), join(out, "3-inicio-escuro.png"));
  console.log(JSON.stringify({ out }));
} finally {
  if (app) await app.evaluate(({ app }) => app.exit(0)).catch(() => {});
  await server.close();
  await rm(userData, { recursive: true, force: true }).catch(() => {});
}

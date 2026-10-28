import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron } from "@playwright/test";
import { createServer } from "vite";

// Colar pelo teclado e pelo menu de contexto nos campos do app (relato de comprador, 28/10/2026).
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const userData = await mkdtemp(join(tmpdir(), "carrossell-paste-"));
const server = await createServer({ root, logLevel: "error", server: { host: "127.0.0.1", port: 0, strictPort: false } });
const result = {};
let app;
try {
  await server.listen();
  app = await _electron.launch({ args: ["."], cwd: root, env: { ...process.env, PACTO_USER_DATA: userData, PACTO_DEV_URL: `http://127.0.0.1:${server.httpServer.address().port}` } });
  const page = await app.firstWindow();
  await page.getByRole("region", { name: "Configuração do projeto" }).waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: /formulário/i }).first().click();
  const field = page.getByRole("textbox").first();
  await app.evaluate(({ clipboard }) => clipboard.writeText("Texto colado pelo teclado"));
  await field.click();
  await page.keyboard.press("Control+V");
  result.keyboard = await field.inputValue();
  await field.fill("");
  await app.evaluate(({ clipboard }) => clipboard.writeText("Texto colado pelo menu"));
  // Abre o menu de contexto do campo e confirma que há "Colar".
  result.menu = await app.evaluate(async ({ BrowserWindow, Menu }) => {
    const items = [];
    const original = Menu.prototype.popup;
    Menu.prototype.popup = function () { items.push(...this.items.map((i) => i.label || i.role)); };
    const w = BrowserWindow.getAllWindows()[0];
    w.webContents.emit("context-menu", { preventDefault() {} }, { isEditable: true, selectionText: "", editFlags: { canCut: true, canCopy: true, canPaste: true, canSelectAll: true }, x: 10, y: 10 });
    Menu.prototype.popup = original;
    return items;
  });
  await field.click();
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].webContents.paste());
  result.menuPaste = await field.inputValue();
  result.appMenu = await app.evaluate(({ Menu }) => (Menu.getApplicationMenu()?.items || []).map((i) => i.label || i.role));
  console.log(JSON.stringify(result));
} finally {
  if (app) await app.evaluate(({ app }) => app.exit(0)).catch(() => {});
  await server.close();
}

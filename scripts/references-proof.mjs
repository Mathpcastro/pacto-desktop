import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron, expect } from "@playwright/test";
import { createServer } from "vite";

// Prova da biblioteca no Electron real, com o preload e o IPC de produção.
// Nenhuma conta ou inferência é necessária para navegar e filtrar o catálogo.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const userData = await mkdtemp(join(tmpdir(), "carrossell-references-"));
const server = await createServer({ root, logLevel: "error", server: { host: "127.0.0.1", port: 0, strictPort: false } });
const env = { ...process.env, PACTO_USER_DATA: userData };
delete env.ELECTRON_RUN_AS_NODE;
let application;

try {
  await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}`;
  application = await _electron.launch({ args: ["."], cwd: root, env: { ...env, PACTO_DEV_URL: url } });
  const page = await application.firstWindow();
  await page.getByRole("region", { name: "Configuração do projeto" }).waitFor();
  await page.evaluate(async () => {
    await window.pacto.request("saveProfile", { profile: { brand: "Prova de referências", product: "Catálogo local", audience: "Teste de interface" } });
  });
  await page.reload();
  await page.getByRole("heading", { name: "O que vamos publicar hoje?" }).waitFor();

  const connected = await page.evaluate(async () => Boolean((await window.pacto.request("bootstrap")).account?.connected));
  assert.equal(connected, false, "A prova deve navegar sem uma conta conectada");

  await page.getByRole("button", { name: "Referências", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Referências que valem estudar" })).toBeVisible();
  const cards = page.locator(".reference-card");
  await expect(cards).toHaveCount(36);

  await page.getByRole("button", { name: "IA", exact: true }).click();
  await expect(cards).toHaveCount(15);

  await page.getByRole("button", { name: "Todos", exact: true }).first().click();
  const search = page.getByRole("textbox", { name: "Buscar referências" });
  await search.fill("Semrush");
  await expect(cards).toHaveCount(1);
  await expect(cards).toContainText("Semrush");

  await search.fill("termo inexistente no catálogo");
  await expect(cards).toHaveCount(0);
  await expect(page.locator(".empty-state")).toBeVisible();

  await page.getByRole("button", { name: "Limpar filtros", exact: true }).click();
  await expect(cards).toHaveCount(36);
  await expect(search).toHaveValue("");

  console.log(JSON.stringify({ passed: true, checks: ["sem conta conectada", "36 referências", "filtro IA: 15", "busca Semrush: 1", "estado vazio", "limpar filtros: 36"] }, null, 2));
} finally {
  if (application) await application.evaluate(({ app }) => app.exit(0)).catch(() => {});
  await server.close();
  await rm(userData, { recursive: true, force: true }).catch(() => {});
}

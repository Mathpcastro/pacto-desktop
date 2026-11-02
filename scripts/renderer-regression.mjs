import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron, expect } from "@playwright/test";
import { createServer } from "vite";

// Uses the production preload/runtime and persisted IPC operations. The slides
// below are hand-authored regression input; no authentication or inference is mocked.
// Covers the studio draft: untouched fields follow runtime events, local edits
// survive concurrent updates and the automatic save never reverts external fields.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const userData = await mkdtemp(join(tmpdir(), "pacto-renderer-regression-"));
const server = await createServer({ root, logLevel: "error", server: { host: "127.0.0.1", port: 0, strictPort: false } });
const checks = [];
let application;
async function check(name, verify) {
  try {
    await verify();
    checks.push({ name, passed: true });
  } catch (error) {
    checks.push({ name, passed: false, error: error.message });
  }
}
try {
  await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}`;
  application = await _electron.launch({ args: ["."], cwd: root, env: { ...process.env, PACTO_USER_DATA: userData, PACTO_DEV_URL: url } });
  const page = await application.firstWindow();
  await page.getByRole("region", { name: "Configuração do projeto" }).waitFor();
  const projectId = await page.evaluate(async () => {
    await window.pacto.request("saveProfile", { profile: { brand: "Regressão técnica", product: "Teste de edição local", audience: "Verificação de software" } });
    const project = await window.pacto.request("createProject", { title: "Regressão renderer · texto manual", brief: "Verificação de sincronização do editor. Não é um resultado de IA." });
    await window.pacto.request("saveProject", {
      id: project.id,
      slides: [
        { id: "regression-slide", title: "Título inicial manual", body: "Corpo inicial manual", visual: "Sem arte", prompt: "" },
        { id: "regression-closing", title: "Encerramento manual", body: "Segundo card", visual: "Sem arte", prompt: "" },
      ],
    });
    return project.id;
  });
  await page.reload();
  await page.getByRole("button", { name: "Abrir Regressão renderer · texto manual", exact: true }).click();
  await page.locator(".outline-row").first().click();
  const title = page.getByRole("textbox", { name: "Título", exact: true });
  const body = page.getByRole("textbox", { name: "Texto", exact: true });
  await expect(title).toHaveValue("Título inicial manual");
  const externalUpdate = (title, body) =>
    page.evaluate(
      async ({ id, title, body }) => {
        const state = await window.pacto.request("bootstrap");
        const project = state.projects.find((p) => p.id === id);
        await window.pacto.request("saveProject", { id, slides: project.slides.map((slide, i) => (i ? slide : { ...slide, title, body })) });
      },
      { id: projectId, title, body },
    );
  const saved = () => page.evaluate(async (id) => (await window.pacto.request("bootstrap")).projects.find((p) => p.id === id).slides[0], projectId);
  await externalUpdate("Título externo atualizado", "Corpo externo atualizado");
  await check("pristine title follows the persisted project event", () => expect(title).toHaveValue("Título externo atualizado", { timeout: 2000 }));
  await check("pristine body follows the persisted project event", () => expect(body).toHaveValue("Corpo externo atualizado", { timeout: 2000 }));
  await check("the outline shows the same external text", () => expect(page.locator(".outline-row").first()).toContainText("Título externo atualizado"));
  // Edição local e atualização externa concorrente antes do salvamento automático.
  await body.fill("Rascunho manual protegido");
  await externalUpdate("Segundo título externo", "Corpo externo concorrente");
  await check("locally edited body survives an external update", () => expect(body).toHaveValue("Rascunho manual protegido"));
  await check("untouched title still receives the concurrent external update", () => expect(title).toHaveValue("Segundo título externo", { timeout: 2000 }));
  await check("automatic save persists the local edit without reverting the external title", async () => {
    await expect.poll(async () => (await saved()).body, { timeout: 5000 }).toBe("Rascunho manual protegido");
    assert.equal((await saved()).title, "Segundo título externo");
    await expect(page.getByText(/^Salvo ·/)).toBeVisible();
  });
  await body.fill("Rascunho salvo ao fechar o painel");
  await page.getByRole("button", { name: "Fechar painel", exact: true }).click();
  await page.locator(".outline-row").first().click();
  await check("closing and reopening the panel keeps the draft", () => expect(body).toHaveValue("Rascunho salvo ao fechar o painel"));
  await body.fill("Rascunho salvo ao voltar");
  await page.getByRole("button", { name: "Voltar ao início", exact: true }).click();
  await check("leaving the studio saves the pending draft first", async () => {
    await page.getByRole("heading", { name: "O que vamos publicar hoje?" }).waitFor();
    await expect.poll(async () => (await saved()).body, { timeout: 5000 }).toBe("Rascunho salvo ao voltar");
  });
  await check("single card count resets for documents and valid sizes are preserved", async () => {
    const format = page.getByRole("button", { name: /Formato/ });
    const size = page.getByRole("button", { name: /Tamanho/ });
    const choose = async (button, name) => {
      await button.click();
      await page.getByRole("menuitemradio", { name, exact: true }).click();
    };
    for (const [documentFormat, singular] of [[/Material gratuito/, "1 página"], [/Apresentação/, "1 slide"]]) {
      await choose(size, "1 card");
      await choose(format, documentFormat);
      await expect(size).toContainText("Automático");
      await expect(size).not.toContainText(singular);
      await choose(format, /^Carrossel/);
    }
    await choose(size, "6 cards");
    await choose(format, /Material gratuito/);
    await expect(size).toContainText("6 páginas");
  });
  console.log(JSON.stringify({ userData, checks }, null, 2));
  assert.equal(checks.filter((item) => !item.passed).length, 0, "Renderer regression checks failed");
} finally {
  if (application) await application.evaluate(({ app }) => app.exit(0)).catch(() => {});
  await server.close();
}

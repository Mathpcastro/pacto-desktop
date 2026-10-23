import assert from "node:assert/strict";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron, expect } from "@playwright/test";
import { createServer } from "vite";

// Uses the production preload/runtime and persisted IPC operations. The slides
// below are hand-authored regression input; no authentication or inference is mocked.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const userData = await mkdtemp(join(tmpdir(), "pacto-renderer-regression-"));
const server = await createServer({
  root,
  server: { host: "127.0.0.1", port: 0, strictPort: false },
});
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
  application = await _electron.launch({
    args: ["."],
    cwd: root,
    env: { ...process.env, PACTO_USER_DATA: userData, PACTO_DEV_URL: url },
  });
  const page = await application.firstWindow();
  await page
    .getByRole("heading", { name: "Seu projeto, montado com você." })
    .waitFor();
  const projectId = await page.evaluate(async () => {
    await window.pacto.request("saveProfile", {
      profile: {
        brand: "Regressão técnica",
        product: "Teste de edição local",
        audience: "Verificação de software",
      },
    });
    const project = await window.pacto.request("createProject", {
      title: "Regressão renderer · texto manual",
      brief:
        "Verificação de sincronização do editor. Não é um resultado de IA.",
    });
    await window.pacto.request("saveProject", {
      id: project.id,
      slides: [
        {
          id: "regression-slide",
          title: "Título inicial manual",
          body: "Corpo inicial manual",
          visual: "Sem arte",
          prompt: "",
        },
        {
          id: "regression-closing",
          title: "Encerramento manual",
          body: "Segundo card para aprovar o texto",
          visual: "Sem arte",
          prompt: "",
        },
      ],
    });
    await window.pacto.request("approveText", { id: project.id });
    return project.id;
  });
  await page.reload();
  await page
    .getByRole("button", {
      name: "Abrir Regressão renderer · texto manual",
      exact: true,
    })
    .click();
  const title = page.getByRole("textbox", { name: "Título", exact: true });
  const body = page.getByRole("textbox", { name: "Texto", exact: true });
  await expect(title).toHaveValue("Título inicial manual");
  const externalUpdate = async (title, body) =>
    page.evaluate(
      async ({ id, title, body }) => {
        const state = await window.pacto.request("bootstrap");
        const project = state.projects.find((p) => p.id === id);
        await window.pacto.request("saveProject", {
          id,
          slides: project.slides.map((slide) => ({ ...slide, title, body })),
        });
      },
      { id: projectId, title, body },
    );
  await externalUpdate("Título externo atualizado", "Corpo externo atualizado");
  await check(
    "pristine same-ID title follows actual persisted project event",
    () =>
      expect(title).toHaveValue("Título externo atualizado", { timeout: 2000 }),
  );
  await check(
    "pristine same-ID body follows actual persisted project event",
    () =>
      expect(body).toHaveValue("Corpo externo atualizado", { timeout: 2000 }),
  );
  await body.fill("Rascunho manual protegido");
  await externalUpdate("Segundo título externo", "Corpo externo concorrente");
  await check("locally edited body survives an external update", () =>
    expect(body).toHaveValue("Rascunho manual protegido"),
  );
  await check("untouched title still receives concurrent external update", () =>
    expect(title).toHaveValue("Segundo título externo", { timeout: 2000 }),
  );
  await page
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Conteúdo salvo", exact: true }),
  ).toBeDisabled();
  await check(
    "save persists local edits without reverting external fields",
    async () => {
      const state = await page.evaluate(() =>
        window.pacto.request("bootstrap"),
      );
      const saved = state.projects.find((p) => p.id === projectId).slides[0];
      assert.equal(saved.body, "Rascunho manual protegido");
      assert.equal(saved.title, "Segundo título externo");
    },
  );
  await body.fill("Rascunho preservado ao ocultar painel");
  await page
    .getByRole("button", { name: "Ocultar painel", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Mostrar painel", exact: true })
    .click();
  await check("hiding and reopening panel retains unsaved local draft", () =>
    expect(body).toHaveValue("Rascunho preservado ao ocultar painel", {
      timeout: 2000,
    }),
  );
  await body.fill("Rascunho preservado durante duplicação");
  await page.locator('summary[aria-label="Mais ações do projeto"]').click();
  await page
    .getByRole("button", { name: "Duplicar carrossel", exact: true })
    .click();
  await check(
    "duplicate asks before navigating away from unsaved draft",
    async () => {
      await expect(
        page.getByRole("heading", { name: "Há alterações não salvas." }),
      ).toBeVisible({ timeout: 2000 });
      await page
        .getByRole("button", { name: "Voltar e revisar", exact: true })
        .click();
      await expect(body).toHaveValue("Rascunho preservado durante duplicação");
      const state = await page.evaluate(() =>
        window.pacto.request("bootstrap"),
      );
      assert.equal(
        state.projects.length,
        1,
        "Cancelling navigation must not duplicate the saved project",
      );
    },
  );
  console.log(JSON.stringify({ userData, checks }, null, 2));
  assert.equal(
    checks.filter((item) => !item.passed).length,
    0,
    "Renderer regression checks failed",
  );
} finally {
  if (application)
    await application.evaluate(({ app }) => app.exit(0)).catch(() => {});
  await server.close();
}

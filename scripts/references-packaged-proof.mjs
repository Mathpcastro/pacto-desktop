import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron, expect } from "@playwright/test";

// Prova do build de produção pelo file://, sem Vite, PACTO_DEV_URL ou inferência.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, ".cache", "references-proof");
await mkdir(out, { recursive: true });
const userData = await mkdtemp(join(tmpdir(), "carrossell-references-production-"));
const env = { ...process.env, PACTO_USER_DATA: userData };
delete env.ELECTRON_RUN_AS_NODE;
delete env.PACTO_DEV_URL;
let application;

try {
  const assetDir = join(root, "dist", "assets");
  const assets = await readdir(assetDir);
  const entryName = assets.find((name) => /^index-.*\.js$/.test(name));
  const referencesName = assets.find((name) => /^References-.*\.js$/.test(name));
  assert.ok(entryName && referencesName, "Chunks inicial e lazy não encontrados");
  const entry = await readFile(join(assetDir, entryName), "utf8");
  const references = await readFile(join(assetDir, referencesName), "utf8");
  const countWebP = (source) => source.split("data:image/webp").length - 1;
  assert.equal(countWebP(entry), 0, "O chunk inicial não pode conter WebP inline");
  assert.equal(countWebP(references), 36, "O chunk lazy deve conter as 36 WebP");

  application = await _electron.launch({ args: ["."], cwd: root, env });
  const page = await application.firstWindow();
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  assert.match(page.url(), /^file:\/\//);
  await page.getByRole("region", { name: "Configuração do projeto" }).waitFor();
  await page.evaluate(async () => {
    await window.pacto.request("saveProfile", { profile: { brand: "Produção de referências", product: "Catálogo local", audience: "Teste file protocol" } });
  });
  await page.reload();
  await page.getByRole("heading", { name: "O que vamos publicar hoje?" }).waitFor();
  const draft = "Tema manual preservado no build de produção.";
  await page.getByLabel("Tema ou ideia").fill(draft);

  await page.getByRole("button", { name: "Referências", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Referências que valem estudar" })).toBeVisible();
  await expect(page.locator(".reference-card")).toHaveCount(36);
  await expect(page.getByRole("main")).toHaveCount(1);
  const images = page.locator(".reference-cover img");
  await expect(images).toHaveCount(36);
  const sources = await images.evaluateAll((items) => items.map((image) => image.src));
  assert.ok(sources.every((source) => source.startsWith("data:image/webp;base64,")), "Capa sem WebP inline");
  await expect.poll(() => images.first().evaluate((image) => image.complete ? image.naturalWidth : 0)).toBe(360);
  assert.equal(await images.first().evaluate((image) => image.naturalHeight), 450);
  await page.screenshot({ path: join(out, "references-production.png") });

  await page.getByRole("button", { name: /^Usar referência CAR-0004:/ }).click();
  await expect(page.getByRole("heading", { name: "O que vamos publicar hoje?" })).toBeVisible();
  await expect(page.getByLabel("Tema ou ideia")).toHaveValue(draft);
  const attached = page.getByLabel("Imagens anexadas").locator("figure");
  await expect(attached).toHaveCount(1);
  await expect(attached.first()).toHaveAttribute("title", /^Referência CAR-0004/);
  const attachedImage = attached.locator("img");
  assert.match(await attachedImage.getAttribute("src"), /^data:image\/webp;base64,/);
  await expect.poll(() => attachedImage.evaluate((image) => image.complete ? image.naturalWidth : 0)).toBe(360);
  const projectCount = await page.evaluate(async () => (await window.pacto.request("bootstrap")).projects.length);
  assert.equal(projectCount, 0, "Usar referência não pode criar projeto ou chamar IA");
  assert.deepEqual(pageErrors, []);
  await page.screenshot({ path: join(out, "references-production-composer.png") });

  console.log(JSON.stringify({ passed: true, protocol: "file://", entryName, entryWebP: 0, referencesName, referencesWebP: 36, images: 36, composerAttachments: 1, projectCount }, null, 2));
} finally {
  if (application) await application.evaluate(({ app }) => app.exit(0)).catch(() => {});
  await rm(userData, { recursive: true, force: true }).catch(() => {});
}

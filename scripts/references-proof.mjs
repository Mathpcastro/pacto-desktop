import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron, expect } from "@playwright/test";
import { createServer } from "vite";

// Prova completa da biblioteca no Electron real, com preload, IPC e Store de produção.
// Nenhuma conta ou inferência é usada; o anexo manual vem de um PNG local e do diálogo nativo.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, ".cache", "references-proof");
await mkdir(out, { recursive: true });
const userData = await mkdtemp(join(tmpdir(), "carrossell-references-"));
const server = await createServer({ root, logLevel: "error", server: { host: "127.0.0.1", port: 0, strictPort: false } });
const env = { ...process.env, PACTO_USER_DATA: userData };
delete env.ELECTRON_RUN_AS_NODE;
const checks = [];
let application;

async function check(name, verify) {
  try {
    await verify();
    checks.push({ name, passed: true });
  } catch (error) {
    checks.push({ name, passed: false, error: error.message.split("\n").slice(0, 4).join(" ") });
  }
}

const audit = (page) => page.evaluate(() => {
  const visible = (el) => {
    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);
    return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
  };
  const small = [];
  for (const el of document.querySelectorAll("body *")) {
    if (!visible(el) || el.closest("iframe, svg")) continue;
    if (![...el.childNodes].some((node) => node.nodeType === 3 && node.textContent.trim())) continue;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size < 12.5) small.push(`${el.tagName.toLowerCase()}.${el.className}:${size}px`);
  }
  const scrollers = [...document.querySelectorAll("body *")].filter((el) => {
    const style = getComputedStyle(el);
    return visible(el) && /(auto|scroll)/.test(style.overflowY) && el.scrollHeight > el.clientHeight + 2 && el.tagName !== "TEXTAREA";
  });
  return {
    small,
    nested: scrollers.filter((el) => scrollers.some((other) => other !== el && other.contains(el))).map((el) => el.className),
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
  };
});

const openReferences = async (page) => {
  await page.getByRole("button", { name: "Início", exact: true }).click();
  await page.getByRole("button", { name: "O que posso fazer no Carrossell?", exact: true }).click();
  const panel = page.getByRole("dialog", { name: "O que posso fazer no Carrossell?", exact: true });
  await panel.getByRole("button", { name: "Encontrar pautas", exact: true }).click();
  await panel.getByRole("button", { name: "Abrir referências", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Referências que valem estudar" })).toBeVisible();
};

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
  await page.getByRole("heading", { name: "O que vamos criar hoje?" }).waitFor();

  const connected = await page.evaluate(async () => Boolean((await window.pacto.request("bootstrap")).account?.connected));
  assert.equal(connected, false, "A prova deve navegar sem uma conta conectada");
  await openReferences(page);
  const cards = page.locator(".reference-card");
  await expect(cards).toHaveCount(36);

  await check("cada botão Usar referência tem um nome acessível único", async () => {
    const labels = await page.locator(".reference-use").evaluateAll((buttons) => buttons.map((button) => button.getAttribute("aria-label")));
    assert.equal(labels.length, 36);
    assert.equal(new Set(labels).size, 36);
    for (const label of labels) assert.match(label || "", /^Usar referência CAR-\d{4}: .+/);
  });
  await check("a biblioteca tem exatamente um landmark main", () => expect(page.getByRole("main")).toHaveCount(1));

  for (const theme of ["light", "dark"]) {
    await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
    for (const [width, height] of [[1440, 900], [1000, 700]]) {
      await page.setViewportSize({ width, height });
      await page.screenshot({ path: join(out, `references-${theme}-${width}.png`) });
      await check(`auditoria ${theme} ${width}x${height}`, async () => {
        const result = await audit(page);
        assert.equal(result.horizontalOverflow, false, "overflow horizontal");
        assert.deepEqual(result.nested, [], "rolagem aninhada");
        assert.deepEqual(result.small, [], "texto visível abaixo de 13px");
      });
    }
  }
  await page.evaluate(() => { document.documentElement.dataset.theme = "light"; });

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

  await page.getByRole("button", { name: "Início", exact: true }).click();
  const draft = "Tema manual preservado: uma rotina simples para organizar o trabalho.";
  await page.getByLabel("Tema ou ideia").fill(draft);
  await page.getByRole("button", { name: "Ajustes", exact: true }).click();
  await page.getByRole("button", { name: /Objetivo/ }).click();
  await page.getByRole("menuitemradio", { name: "Comentários", exact: true }).click();
  await page.getByRole("button", { name: /Tipo/ }).click();
  await page.getByRole("menuitemradio", { name: /^Tutorial/ }).click();
  await page.getByRole("button", { name: /Tamanho/ }).click();
  await check("composer Tamanho oferece Automático e 1–10, com singular em 1 card", async () => {
    const options = page.getByRole("menuitemradio");
    await expect(options).toHaveCount(11);
    await expect(options.locator("b")).toHaveText(["Automático", "1 card", ...Array.from({ length: 9 }, (_, index) => `${index + 2} cards`)]);
  });
  await page.getByRole("menuitemradio", { name: "6 cards", exact: true }).click();

  const manualPng = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 360;
    canvas.height = 450;
    const context = canvas.getContext("2d");
    context.fillStyle = "#eeeeee";
    context.fillRect(0, 0, 360, 450);
    context.fillStyle = "#222222";
    context.font = "24px sans-serif";
    context.fillText("Anexo manual", 48, 220);
    return canvas.toDataURL("image/png");
  });
  const manualPath = join(userData, "manual.png");
  await writeFile(manualPath, Buffer.from(manualPng.split(",")[1], "base64"));
  await application.evaluate(({ dialog }, file) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [file] });
  }, manualPath);
  const attach = () => page.getByRole("button", { name: "Anexar foto de referência ou o que você quer que vá no carrossel" }).click();
  await attach();
  await expect(page.getByLabel("Imagens anexadas").locator("figure")).toHaveCount(1);

  await openReferences(page);
  await page.locator(".reference-use").nth(0).click();
  await expect(page.getByRole("heading", { name: "O que vamos criar hoje?" })).toBeVisible();
  await check("usar referência preserva tema, anexo manual e opções do composer", async () => {
    await expect(page.getByLabel("Tema ou ideia")).toHaveValue(draft);
    await expect(page.getByLabel("Imagens anexadas").locator("figure")).toHaveCount(2);
    await expect(page.getByLabel("Imagens anexadas").locator("figure[title^='Referência CAR-']")).toHaveCount(1);
    await expect(page.getByRole("button", { name: /Objetivo/ })).toContainText("Comentários");
    await expect(page.getByRole("button", { name: /Tipo/ })).toContainText("Tutorial");
    await expect(page.getByRole("button", { name: /Tamanho/ })).toContainText("6 cards");
  });

  await openReferences(page);
  await page.locator(".reference-use").nth(1).click();
  await expect(page.getByRole("heading", { name: "O que vamos criar hoje?" })).toBeVisible();
  await check("trocar referência mantém o manual e somente uma da biblioteca", async () => {
    const attached = page.getByLabel("Imagens anexadas").locator("figure");
    await expect(attached).toHaveCount(2);
    await expect(page.getByLabel("Imagens anexadas").locator("figure[title^='Referência CAR-']")).toHaveCount(1);
    await expect(page.getByLabel("Imagens anexadas").locator("figure[title^='Referência CAR-0007']")).toHaveCount(1);
    await expect(attached.first()).toHaveAttribute("title", "manual.png");
  });

  await page.getByRole("button", { name: "Criar carrossel", exact: true }).click();
  await page.getByRole("navigation", { name: "Etapas" }).waitFor();
  await check("criar sem conta persiste briefing e dois anexos sem referenceId", async () => {
    const project = await page.evaluate(async (brief) => {
      const state = await window.pacto.request("bootstrap");
      return state.projects.find((item) => item.brief === brief);
    }, draft);
    assert.ok(project, "projeto não persistido");
    assert.equal(project.brief, draft);
    assert.equal(project.attachments.length, 2);
    assert.ok(project.attachments.some((item) => item.name === "manual.png"));
    assert.ok(project.attachments.some((item) => item.name.startsWith("Referência CAR-0007")));
    assert.ok(project.attachments.every((item) => !Object.hasOwn(item, "referenceId")));
  });
  await check("Estúdio escolhe 3 cards, fecha o popover e persiste o tamanho", async () => {
    const project = await page.evaluate(async (brief) => {
      const state = await window.pacto.request("bootstrap");
      return state.projects.find((item) => item.brief === brief);
    }, draft);
    assert.ok(project, "projeto não persistido");
    const size = page.getByRole("button", { name: /Tamanho/ });
    await size.click();
    await expect(size).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("menuitemradio")).toHaveCount(10);
    await page.getByRole("menuitemradio", { name: "3 cards", exact: true }).click();
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(size).toHaveAttribute("aria-expanded", "false");
    await expect(size).toContainText("3 cards");
    const resized = await page.evaluate(async (id) => {
      const state = await window.pacto.request("bootstrap");
      return state.projects.find((item) => item.id === id).cardCount;
    }, project.id);
    assert.equal(resized, 3);
  });
  await check("Tamanho fecha ao clicar em outro controle da barra", async () => {
    const size = page.getByRole("button", { name: /Tamanho/ });
    await size.click();
    await expect(page.getByRole("menu")).toBeVisible();
    await page.getByLabel("Nome do projeto").click();
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(size).toHaveAttribute("aria-expanded", "false");
  });
  await page.keyboard.press("Escape");
  await check("Tamanho navega por teclado e Escape devolve o foco ao botão", async () => {
    const size = page.getByRole("button", { name: /Tamanho/ });
    const option = (name) => page.getByRole("menuitemradio", { name: new RegExp(`^${name}`) });
    await size.click();
    await expect(option("3 cards")).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(option("4 cards")).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(option("3 cards")).toBeFocused();
    await page.keyboard.press("End");
    await expect(option("10 cards")).toBeFocused();
    await page.keyboard.press("Home");
    await expect(option("1 card")).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(option("10 cards")).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(option("1 card")).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await expect(size).toBeFocused();
  });
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Voltar ao início", exact: true }).click();
  for (let index = 1; index <= 6; index += 1) {
    await attach();
    await expect(page.getByLabel("Imagens anexadas").locator("figure")).toHaveCount(index);
  }
  await page.getByRole("button", { name: /Formato/ }).click();
  await page.getByRole("menuitemradio", { name: /Material gratuito/ }).click();
  await expect(page.getByRole("button", { name: "Criar material", exact: true })).toBeVisible();
  await openReferences(page);
  await page.locator(".reference-use").first().click();
  await expect(page.getByRole("heading", { name: "O que vamos criar hoje?" })).toBeVisible();
  await check("seis manuais em Material voltam para Carrossel", () => expect(page.getByRole("button", { name: "Criar carrossel", exact: true })).toBeVisible());
  await check("seis manuais permanecem visíveis após o aviso", () => expect(page.getByLabel("Imagens anexadas").locator("figure")).toHaveCount(6));
  await check("o aviso orienta remover um anexo manual", () => expect(page.locator(".snack")).toContainText("Você já tem 6 anexos manuais. Remova um para trocar a referência."));

  const failed = checks.filter((item) => !item.passed);
  console.log(JSON.stringify({ out, passed: checks.length - failed.length, failed: failed.length, checks }, null, 2));
  assert.equal(failed.length, 0, "Reference proof checks failed");
} finally {
  if (application) await application.evaluate(({ app }) => app.exit(0)).catch(() => {});
  await server.close();
  await rm(userData, { recursive: true, force: true }).catch(() => {});
}

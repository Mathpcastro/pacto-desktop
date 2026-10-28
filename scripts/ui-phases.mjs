import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron, expect } from "@playwright/test";
import { createServer } from "vite";

// Testes de interface do estúdio (direção A), fase por fase, no Electron real:
// preload, runtime, renderização offscreen dos modelos e PDF de verdade.
// Nada de IA aqui: os textos são escritos à mão e marcados como tal.
// Uso: node scripts/ui-phases.mjs [pasta-de-saída]
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] || join(root, ".cache", "ui-phases"));
await mkdir(out, { recursive: true });
const userData = await mkdtemp(join(tmpdir(), "carrossell-ui-"));
const server = await createServer({ root, logLevel: "error", server: { host: "127.0.0.1", port: 0, strictPort: false } });
const results = [];
let phase = "";
async function check(name, verify) {
  try {
    await verify();
    results.push({ phase, name, passed: true });
  } catch (error) {
    results.push({ phase, name, passed: false, error: error.message.split("\n").slice(0, 3).join(" ") });
  }
}
// Regras de UI/UX do redesenho, medidas na tela inteira.
const audit = (page) =>
  page.evaluate(() => {
    const visible = (el) => {
      const r = el.getBoundingClientRect();
      const cs = getComputedStyle(el);
      return r.width > 0 && r.height > 0 && cs.visibility !== "hidden" && cs.display !== "none";
    };
    const small = [];
    for (const el of document.querySelectorAll("body *")) {
      if (!visible(el) || el.closest("iframe, svg")) continue;
      const own = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
      if (!own) continue;
      const size = parseFloat(getComputedStyle(el).fontSize);
      if (size < 12.5) small.push(`${el.tagName.toLowerCase()}.${el.className}:${size}px "${el.textContent.trim().slice(0, 30)}"`);
    }
    const scrollers = [...document.querySelectorAll("body *")].filter((el) => {
      const cs = getComputedStyle(el);
      return visible(el) && /(auto|scroll)/.test(cs.overflowY) && el.scrollHeight > el.clientHeight + 2 && el.tagName !== "TEXTAREA";
    });
    const nested = scrollers.filter((el) => scrollers.some((other) => other !== el && other.contains(el)));
    const textareas = [...document.querySelectorAll("textarea")].filter((t) => visible(t) && t.scrollHeight > t.clientHeight + 4);
    const bar = document.querySelector(".topbar");
    return {
      small: small.slice(0, 8),
      smallCount: small.length,
      nested: nested.map((el) => el.className),
      scrollingTextareas: textareas.map((t) => t.getAttribute("aria-label") || t.placeholder || "textarea"),
      barControls: bar ? [...bar.querySelectorAll("button, input, [role=button]")].filter(visible).length : 0,
      horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    };
  });
const png1080 = async (page, dataUrl) =>
  page.evaluate(
    (src) =>
      new Promise((res) => {
        const img = new Image();
        img.onload = () => res([img.naturalWidth, img.naturalHeight]);
        img.src = src;
      }),
    dataUrl,
  );
const shot = (page, name) => page.screenshot({ path: join(out, `${name}.png`) });
// Gera uma foto PNG simples no próprio renderer (pessoa estilizada), sem arquivos externos.
const fakePhoto = (page, hue) =>
  page.evaluate((h) => {
    const c = document.createElement("canvas");
    c.width = 600;
    c.height = 750;
    const g = c.getContext("2d");
    g.fillStyle = `hsl(${h} 30% 80%)`;
    g.fillRect(0, 0, 600, 750);
    g.fillStyle = "#2a1d16";
    g.beginPath();
    g.arc(300, 270, 125, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#e3b08c";
    g.beginPath();
    g.arc(300, 300, 105, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "#1e2328";
    g.beginPath();
    g.ellipse(300, 760, 260, 300, 0, 0, Math.PI * 2);
    g.fill();
    return c.toDataURL("image/png");
  }, hue);

let application;
try {
  await server.listen();
  const url = `http://127.0.0.1:${server.httpServer.address().port}`;
  application = await _electron.launch({ args: ["."], cwd: root, env: { ...process.env, PACTO_USER_DATA: userData, PACTO_DEV_URL: url } });
  const page = await application.firstWindow();
  // Diálogos nativos de salvar: grava direto na pasta de saída do teste.
  await application.evaluate(({ dialog }, folder) => {
    dialog.showSaveDialog = async (_w, options) => ({ canceled: false, filePath: `${folder}\\${options.defaultPath}` });
  }, out);
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.getByRole("region", { name: "Configuração do projeto" }).waitFor({ timeout: 30000 });

  phase = "0 · Primeiro uso";
  await check("onboarding: texto ≥ 13px e sem rolagem aninhada", async () => {
    const a = await audit(page);
    assert.equal(a.smallCount, 0, a.small.join(" | "));
    assert.deepEqual(a.nested, []);
  });
  await shot(page, "00-primeiro-uso");

  phase = "1 · Marca e base";
  const brandContext = "# CONTEXTO OFICIAL DA MARCA\n## Agendei\n\n### Negócio\nAgenda online e lembretes por WhatsApp para **clínicas pequenas**.\n\n### Público\n- Donas de clínicas de estética\n- Fisioterapeutas com 1 a 5 profissionais\n\n_Texto de teste escrito à mão, não gerado por IA._";
  const designKit = "# DESIGN KIT OFICIAL\n## Paleta\n- Verde-menta #3CC8A0: destaques\n- Grafite #1E2328: títulos\n- Branco #FFFFFF: fundo\n- Apoio #F5F7F6: áreas de respiro";
  await page.evaluate(
    async ({ brandContext, designKit }) => {
      await window.pacto.request("saveProfile", { profile: { brand: "Agendei", brandContext, designKit } });
    },
    { brandContext, designKit },
  );
  const avatar = await fakePhoto(page, 160);
  const face = await fakePhoto(page, 20);
  await page.evaluate(
    async ({ avatar, face }) => {
      await window.pacto.request("saveMedia", { displayName: "Agendei", handle: "agendei.app", avatar, addFaces: [{ name: "Selfie no consultório", dataUrl: face }] });
    },
    { avatar, face },
  );
  await page.reload();
  await page.getByRole("heading", { name: "O que vamos publicar hoje?" }).waitFor();
  await check("a barra única tem poucos controles", async () => {
    const a = await audit(page);
    assert.ok(a.barControls <= 6, `controles na barra: ${a.barControls}`);
  });
  await page.getByRole("button", { name: "Marca", exact: true }).click();
  await page.getByRole("heading", { name: "Agendei", level: 1 }).waitFor();
  await check("Marca mostra o contexto legível, sem Markdown cru", async () => {
    await expect(page.getByText("clínicas pequenas", { exact: true })).toBeVisible();
    await expect(page.getByText("### Negócio")).toHaveCount(0);
  });
  await check("a paleta do Design Kit aparece com as cores certas", async () => {
    await expect(page.getByText("#3cc8a0", { exact: true })).toBeVisible();
    await expect(page.getByText("#1e2328", { exact: true })).toBeVisible();
  });
  await page.getByLabel("Sugerir uma cena sua").fill("Xícara de café ao lado da agenda de papel");
  await page.getByRole("button", { name: "Adicionar", exact: true }).click();
  await page.getByRole("button", { name: "Aprovar", exact: true }).first().click();
  await check("cena manual entra e pode ser aprovada", async () => {
    await expect(page.getByText(/1 aprovadas/)).toBeVisible();
  });
  await check("selo de verificado vem ligado e aparece na prévia", async () => {
    await expect(page.getByLabel("Mostrar selo de verificado")).toBeChecked();
    const html = await page.locator(".tweet-preview iframe").getAttribute("srcdoc");
    assert.match(html, /aria-label="verificado"/);
  });
  await check("Marca: texto ≥ 13px, sem rolagem aninhada e sem caixa de texto rolando", async () => {
    const a = await audit(page);
    assert.equal(a.smallCount, 0, a.small.join(" | "));
    assert.deepEqual(a.nested, []);
    assert.deepEqual(a.scrollingTextareas, []);
  });
  await shot(page, "01-marca");

  phase = "2 · Início e Ctrl+K";
  await page.getByRole("button", { name: "Início", exact: true }).click();
  await page.keyboard.press("Control+k");
  await check("Ctrl+K abre a paleta, filtra e executa", async () => {
    await expect(page.getByRole("combobox", { name: "O que você quer fazer?" })).toBeFocused();
    await page.keyboard.type("abrir marca");
    await expect(page.getByRole("option")).toHaveCount(1);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "Agendei", level: 1 })).toBeVisible();
  });
  if (await page.locator(".scrim").count()) await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Início", exact: true }).click();
  await check("barra de criar troca o formato e esconde opções de carrossel", async () => {
    await page.getByRole("button", { name: /Formato/ }).click();
    await page.getByRole("menuitemradio", { name: /Material gratuito/ }).click();
    await expect(page.getByRole("button", { name: /Estilo/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Criar material" })).toBeVisible();
    await page.getByRole("button", { name: /Formato/ }).click();
    await page.getByRole("menuitemradio", { name: /^Carrossel/ }).click();
  });
  await page.getByRole("button", { name: /Estilo/ }).click();
  await page.getByRole("menuitemradio", { name: /^Tweet/ }).click();
  await page.getByLabel("Tema ou ideia").fill("4 informações que toda confirmação de consulta precisa ter");
  await check("Início: texto ≥ 13px, sem rolagem aninhada, sem estouro lateral", async () => {
    const a = await audit(page);
    assert.equal(a.smallCount, 0, a.small.join(" | "));
    assert.deepEqual(a.nested, []);
    assert.equal(a.horizontalOverflow, false);
  });
  await shot(page, "02-inicio");
  await page.getByRole("button", { name: "Criar carrossel" }).click();

  phase = "3 · Estúdio: texto";
  await page.getByRole("navigation", { name: "Etapas" }).waitFor();
  const carouselId = await page.evaluate(async () => (await window.pacto.request("bootstrap")).projects[0].id);
  await check("projeto criado com o estilo escolhido", async () => {
    const p = await page.evaluate(async (id) => (await window.pacto.request("bootstrap")).projects.find((x) => x.id === id), carouselId);
    assert.equal(p.style, "tweet");
    assert.equal(p.format, "carrossel");
  });
  // Texto escrito à mão (sem conta conectada não há geração).
  await page.evaluate(async (id) => {
    await window.pacto.request("saveProject", {
      id,
      caption: "Salve para revisar sua próxima confirmação.\n\nTexto de teste escrito à mão.",
      slides: [
        { id: "c1", role: "Capa", title: "4 informações que toda confirmação precisa ter", body: "", emphasis: "confirmação" },
        { id: "c2", role: "Contexto", title: "Qual dia? Que horas?", body: "Data com dia da semana e horário completo.", emphasis: "Que horas?" },
        { id: "c3", role: "Passo", title: "Onde ir e como chegar", body: "Endereço, referência e link do mapa.", emphasis: "como chegar" },
        { id: "c4", role: "CTA", title: "Salve e use na próxima", body: "Comente CHECKLIST e receba o modelo.", emphasis: "Salve" },
      ],
    });
  }, carouselId);
  await page.getByRole("button", { name: /Capa 4 informações/ }).waitFor();
  await check("roteiro mostra os cards e o painel de revisão", async () => {
    await expect(page.locator(".outline-row")).toHaveCount(4);
    await expect(page.getByRole("group", { name: /Revisão humana/ })).toBeVisible();
  });
  await check("aprovar fica bloqueado até a revisão humana", async () => {
    await expect(page.getByRole("button", { name: /Revisão 0\/6/ })).toBeDisabled();
  });
  await page.locator(".outline-row").nth(1).click();
  const titleField = page.getByRole("textbox", { name: "Título", exact: true });
  await titleField.fill("Qual dia? Que horas? Onde?");
  await check("editar no painel atualiza o roteiro e salva sozinho", async () => {
    await expect(page.locator(".outline-row").nth(1)).toContainText("Onde?");
    await expect(page.getByText(/^Salvo ·/)).toBeVisible({ timeout: 5000 });
    const p = await page.evaluate(async (id) => (await window.pacto.request("bootstrap")).projects.find((x) => x.id === id), carouselId);
    assert.equal(p.slides[1].title, "Qual dia? Que horas? Onde?");
  });
  await page.getByRole("button", { name: "Fechar painel" }).click();
  for (const box of await page.getByRole("group", { name: /Revisão humana/ }).getByRole("checkbox").all()) await box.check();
  await check("Estúdio texto: texto ≥ 13px, sem rolagem aninhada", async () => {
    const a = await audit(page);
    assert.equal(a.smallCount, 0, a.small.join(" | "));
    assert.deepEqual(a.nested, []);
    assert.deepEqual(a.scrollingTextareas, []);
  });
  await shot(page, "03-texto");
  await page.getByRole("button", { name: "Aprovar e criar capas" }).click();

  phase = "4 · Estúdio: capa e estilos";
  await check("3 opções de capa renderizadas na hora, sem IA", async () => {
    await expect(page.locator(".cover-opt")).toHaveCount(3, { timeout: 30000 });
    const p = await page.evaluate(async (id) => (await window.pacto.request("bootstrap")).projects.find((x) => x.id === id), carouselId);
    assert.deepEqual(await png1080(page, p.coverOptions[0].image), [1080, 1350]);
  });
  await shot(page, "04-capa");
  await page.locator(".cover-opt").nth(1).click();
  await page.getByRole("button", { name: "Usar esta capa" }).click();
  await check("escolher a capa monta todos os cards em 1080×1350", async () => {
    await expect(page.getByRole("button", { name: "Ir para publicar" })).toBeVisible({ timeout: 30000 });
    const p = await page.evaluate(async (id) => (await window.pacto.request("bootstrap")).projects.find((x) => x.id === id), carouselId);
    assert.equal(p.styleVariant, 1);
    for (const s of p.slides) assert.deepEqual(await png1080(page, s.image), [1080, 1350]);
  });
  await shot(page, "05-carrossel-tweet");
  for (const [style, file] of [["Texto + foto", "06-estilo-foto"], ["Sua foto", "07-estilo-recorte"], ["Texto preto", "08-estilo-texto"]]) {
    await page.getByRole("group", { name: "Estilo do carrossel" }).getByRole("button", { name: style }).click();
    await expect(page.locator(".cover-opt")).toHaveCount(3, { timeout: 30000 });
    await page.getByRole("button", { name: "Usar esta capa" }).click();
    await expect(page.getByRole("button", { name: "Ir para publicar" })).toBeVisible({ timeout: 30000 });
    await shot(page, file);
  }
  await check("trocar de estilo refaz capa e cards sem perder o texto", async () => {
    const p = await page.evaluate(async (id) => (await window.pacto.request("bootstrap")).projects.find((x) => x.id === id), carouselId);
    assert.equal(p.style, "textopreto");
    assert.equal(p.slides[1].title, "Qual dia? Que horas? Onde?");
    assert.ok(p.slides.every((s) => s.image && s.state === "complete"));
  });
  await page.getByRole("button", { name: /Editar card 1/ }).click();
  await check("clicar no card abre o painel; Esc fecha", async () => {
    await expect(page.getByRole("complementary", { name: "Editar card" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("complementary", { name: "Editar card" })).toHaveCount(0);
  });
  await check("Estúdio carrossel: texto ≥ 13px, sem rolagem aninhada", async () => {
    const a = await audit(page);
    assert.equal(a.smallCount, 0, a.small.join(" | "));
    assert.deepEqual(a.nested, []);
  });
  await page.getByRole("button", { name: "Ir para publicar" }).click();

  phase = "5 · Publicar";
  await check("prévia no celular, abas e um único botão principal", async () => {
    await expect(page.getByLabel("Prévia no Instagram")).toBeVisible();
    await expect(page.getByRole("tab")).toHaveCount(4);
    await expect(page.locator(".topbar .btn.primary")).toHaveText(/Marquei como publicado/);
  });
  await page.getByRole("button", { name: "Outros destinos" }).click();
  await page.getByRole("button", { name: /PDF para o LinkedIn/ }).click();
  await check("PDF do carrossel para o LinkedIn sai com uma página por card", async () => {
    const file = join(out, `${"4 informações que toda confirmação de consulta precisa ter"}.pdf`);
    await expect.poll(async () => (await stat(file).catch(() => null))?.size || 0, { timeout: 20000 }).toBeGreaterThan(1000);
    const pdf = (await readFile(file)).toString("latin1");
    assert.ok(pdf.startsWith("%PDF"));
    assert.equal((pdf.match(/\/Type\s*\/Page[^s]/g) || []).length, 4);
  });
  await page.getByRole("tab", { name: "Comentário e DM" }).click();
  await shot(page, "09-publicar-dm");
  await page.getByRole("button", { name: "Marquei como publicado" }).click();
  await check("marcar como publicado leva à aba Resultado", async () => {
    await expect(page.getByRole("tab", { name: "Resultado" })).toHaveAttribute("aria-selected", "true");
  });
  await check("Publicar: texto ≥ 13px, sem rolagem aninhada", async () => {
    const a = await audit(page);
    assert.equal(a.smallCount, 0, a.small.join(" | "));
    assert.deepEqual(a.nested, []);
  });
  await shot(page, "10-publicar");

  phase = "6 · PDFs";
  await page.getByRole("tab", { name: "Comentário e DM" }).click();
  await page.getByRole("button", { name: "Criar PDF com a sua marca" }).click();
  await page.getByRole("navigation", { name: "Etapas" }).getByRole("button", { name: "Roteiro" }).waitFor();
  const materialId = await page.evaluate(async () => (await window.pacto.request("bootstrap")).projects.find((p) => p.format === "material").id);
  await check("material nasce ligado ao carrossel", async () => {
    const p = await page.evaluate(async (id) => (await window.pacto.request("bootstrap")).projects.find((x) => x.id === id), materialId);
    assert.equal(p.sourceId, carouselId);
  });
  await page.evaluate(async (id) => {
    await window.pacto.request("saveProject", {
      id,
      caption: "Aqui está o seu checklist. Texto de teste escrito à mão.",
      slides: [
        { id: "m1", layout: "cover", role: "Material gratuito", title: "Checklist da confirmação perfeita", body: "4 informações para o paciente chegar no dia certo.", emphasis: "confirmação perfeita" },
        { id: "m2", layout: "text", role: "Introdução", title: "Por que o paciente falta", body: "Na maioria das vezes falta uma informação na mensagem.", emphasis: "falta" },
        { id: "m3", layout: "checklist", role: "Checklist", title: "Antes de enviar, confira", body: "Data com dia da semana\nHorário completo\nEndereço com referência\nComo desmarcar", emphasis: "confira" },
        { id: "m4", layout: "quote", role: "Modelo", title: "Mensagem pronta para copiar", body: "Olá, {nome}! Sua consulta está confirmada para terça, 4/11, às 14h.", emphasis: "pronta" },
        { id: "m5", layout: "cta", role: "Próximo passo", title: "Quer que isso saia sozinho?", body: "Responda AGENDA na DM.", emphasis: "sozinho" },
      ],
    });
  }, materialId);
  await expect(page.locator(".outline-row")).toHaveCount(5);
  await page.getByRole("button", { name: "Aprovar roteiro" }).click();
  await expect(page.locator(".cover-opt")).toHaveCount(3, { timeout: 30000 });
  await shot(page, "11-material-capa");
  await page.locator(".cover-opt").nth(0).click();
  await page.getByRole("button", { name: "Usar esta capa" }).click();
  await check("páginas A4 aparecem na prévia ao vivo", async () => {
    await expect(page.locator(".stage-frame.a4 iframe")).toHaveCount(1, { timeout: 20000 });
    await expect(page.locator(".thumb")).toHaveCount(5);
  });
  await page.locator(".thumb").nth(2).click();
  await shot(page, "12-material-paginas");
  await page.getByRole("button", { name: "Ir para exportar" }).click();
  await page.getByRole("button", { name: "Baixar PDF" }).click();
  await check("PDF A4 do material sai com 5 páginas", async () => {
    const p = await page.evaluate(async (id) => (await window.pacto.request("bootstrap")).projects.find((x) => x.id === id), materialId);
    const file = join(out, `${p.title}.pdf`);
    await expect.poll(async () => (await stat(file).catch(() => null))?.size || 0, { timeout: 20000 }).toBeGreaterThan(1000);
    const pdf = (await readFile(file)).toString("latin1");
    assert.equal((pdf.match(/\/Type\s*\/Page[^s]/g) || []).length, 5);
    assert.match(pdf, /MediaBox\s*\[\s*0 0 595/);
  });
  await shot(page, "13-material-exportar");
  // Apresentação 16:9 pela barra de criar.
  await page.getByRole("button", { name: "Voltar ao início" }).click();
  await page.getByRole("button", { name: /Formato/ }).click();
  await page.getByRole("menuitemradio", { name: /Apresentação/ }).click();
  await page.getByLabel("Tema ou ideia").fill("Apresentação do Agendei para donas de clínica");
  await page.getByRole("button", { name: "Criar apresentação" }).click();
  await page.getByRole("navigation", { name: "Etapas" }).waitFor();
  const deckId = await page.evaluate(async () => (await window.pacto.request("bootstrap")).projects.find((p) => p.format === "apresentacao").id);
  await page.evaluate(async (id) => {
    await window.pacto.request("saveProject", {
      id,
      slides: [
        { id: "d1", layout: "cover", role: "Apresentação", title: "Agendei para clínicas", body: "Agenda online e lembretes automáticos.", emphasis: "clínicas" },
        { id: "d2", layout: "checklist", role: "Problema", title: "Onde a agenda perde tempo", body: "Confirmações uma a uma\nPacientes que esquecem\nHorários vagos tarde demais\nRemarcações longas", emphasis: "perde tempo" },
        { id: "d3", layout: "steps", role: "Como funciona", title: "Como funciona", body: "Paciente marca — pelo link\nConfirmação — automática\nLembrete — na véspera", emphasis: "" },
        { id: "d4", layout: "cta", role: "Próximo passo", title: "Teste com a sua agenda", body: "Chamada de 20 minutos.", emphasis: "sua agenda" },
      ],
    });
    await window.pacto.request("approveText", { id });
    const p = await window.pacto.request("generateCovers", { id });
    await window.pacto.request("chooseCover", { id, optionId: p.coverOptions[0].id });
  }, deckId);
  await page.getByRole("navigation", { name: "Etapas" }).getByRole("button", { name: "Exportar" }).click();
  await page.getByRole("button", { name: "Baixar PDF" }).click();
  await check("apresentação sai em PDF 16:9 com 4 slides", async () => {
    const p = await page.evaluate(async (id) => (await window.pacto.request("bootstrap")).projects.find((x) => x.id === id), deckId);
    const file = join(out, `${p.title}.pdf`);
    await expect.poll(async () => (await stat(file).catch(() => null))?.size || 0, { timeout: 20000 }).toBeGreaterThan(1000);
    const pdf = (await readFile(file)).toString("latin1");
    assert.equal((pdf.match(/\/Type\s*\/Page[^s]/g) || []).length, 4);
    assert.match(pdf, /MediaBox\s*\[\s*0 0 960 540/);
  });
  await shot(page, "14-apresentacao");

  phase = "7 · Janela pequena e diálogos";
  await page.getByRole("button", { name: "Voltar ao início" }).click();
  await page.setViewportSize({ width: 1093, height: 580 });
  await check("Início em 1093×580 (1366×768 a 125%): sem estouro lateral nem rolagem aninhada", async () => {
    const a = await audit(page);
    assert.equal(a.horizontalOverflow, false);
    assert.deepEqual(a.nested, []);
  });
  await shot(page, "15-inicio-janela-pequena");
  await page.getByRole("button", { name: /Abrir 4 informações/ }).click();
  await check("Estúdio em 1093×580: botão principal visível sem rolar", async () => {
    await expect(page.locator(".topbar .btn.primary")).toBeInViewport();
    const a = await audit(page);
    assert.deepEqual(a.nested, []);
  });
  await shot(page, "16-estudio-janela-pequena");
  await page.getByRole("button", { name: "Mais ações do projeto" }).click();
  await page.getByRole("button", { name: /Excluir/ }).click();
  await check("diálogo de confirmação cabe sem rolagem", async () => {
    const d = await page.evaluate(() => {
      const el = document.querySelector("dialog[open]");
      return { scroll: el.scrollHeight, client: el.clientHeight };
    });
    assert.ok(d.scroll <= d.client + 1, JSON.stringify(d));
  });
  await page.getByRole("button", { name: "Manter" }).click();
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "dark";
  });
  await page.getByRole("button", { name: "Voltar ao início" }).click();
  await shot(page, "17-inicio-escuro");
  await page.evaluate(() => {
    document.documentElement.dataset.theme = "light";
  });

  phase = "8 · Imagens da marca e anexos";
  // O seletor de arquivo devolve fotos geradas no próprio teste, uma por clique.
  const files = [];
  for (const [name, hue] of [["logo-agendei.png", 160], ["caixa-do-produto.png", 30], ["print-do-app.png", 210], ["foto-extra.png", 300]]) {
    const file = join(userData, name);
    await writeFile(file, Buffer.from((await fakePhoto(page, hue)).split(",")[1], "base64"));
    files.push(file);
  }
  await application.evaluate(({ dialog }, list) => {
    let next = 0;
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [list[next++ % list.length]] });
  }, files);
  await page.getByRole("button", { name: "Marca", exact: true }).click();
  await page.getByRole("button", { name: "Adicionar imagem" }).click();
  await page.getByRole("button", { name: "Adicionar imagem" }).click();
  await check("Marca: logo e produto entram como Imagens da marca, com o tipo certo", async () => {
    await expect(page.getByLabel("Tipo de logo-agendei")).toHaveValue("logo");
    await expect(page.getByLabel("Tipo de caixa-do-produto")).toHaveValue("produto");
    await page.getByLabel("Tipo de caixa-do-produto").selectOption("outro");
    await expect(page.getByLabel("Tipo de caixa-do-produto")).toHaveValue("outro");
    await page.getByLabel("Tipo de caixa-do-produto").selectOption("produto");
    const s = await page.evaluate(() => window.pacto.request("bootstrap"));
    assert.deepEqual(s.media.assets.map((a) => a.kind), ["logo", "produto"]);
  });
  await page.getByText("Imagens da marca").scrollIntoViewIfNeeded();
  await shot(page, "18-imagens-da-marca");
  await page.getByRole("button", { name: "Início", exact: true }).click();
  await page.getByRole("button", { name: "Anexar foto de referência ou o que você quer que vá no carrossel" }).click();
  await check("Início: o anexo aparece na barra antes de criar", async () => {
    await expect(page.getByLabel("Imagens anexadas").locator("figure")).toHaveCount(1);
  });
  await shot(page, "19-anexo-na-barra");
  await page.getByLabel("Tema ou ideia").fill("Conheça o Agendei por dentro: a tela de agenda e o que vem no plano.");
  await page.getByRole("button", { name: /Estilo/ }).click();
  await page.getByRole("menuitemradio", { name: /^Tweet/ }).click();
  await page.getByRole("button", { name: "Criar carrossel" }).click();
  await page.getByRole("navigation", { name: "Etapas" }).waitFor();
  const attachedId = await page.evaluate(async () => (await window.pacto.request("bootstrap")).projects[0].id);
  await check("criar leva o anexo para o projeto e limpa a barra", async () => {
    const p = await page.evaluate(async (id) => (await window.pacto.request("bootstrap")).projects.find((x) => x.id === id), attachedId);
    assert.equal(p.attachments.length, 1);
    assert.equal(p.attachments[0].name, "print-do-app.png");
  });
  await page.evaluate(async (id) => {
    await window.pacto.request("saveProject", { id, slides: [
      { id: "a1", role: "Capa", title: "O Agendei por dentro", body: "", emphasis: "por dentro" },
      { id: "a2", role: "Tela", title: "A agenda do dia inteira numa tela", body: "Cada horário com o nome, o serviço e a confirmação.", emphasis: "" },
      { id: "a3", role: "Oferta", title: "Teste 14 dias grátis", body: "Comente AGENDA que eu te mando o link.", emphasis: "14 dias" },
    ] });
    await window.pacto.request("approveText", { id });
    await window.pacto.request("generateCovers", { id });
  }, attachedId);
  await expect(page.locator(".cover-opt")).toHaveCount(3, { timeout: 30000 });
  await page.getByRole("button", { name: "Usar esta capa" }).click();
  await expect(page.getByRole("button", { name: "Ir para publicar" })).toBeVisible({ timeout: 30000 });
  await page.locator(".thumb").nth(1).click();
  await page.getByRole("button", { name: /Editar card 2/ }).click();
  const pick = page.getByRole("group", { name: "Imagem no card" });
  await check("o card mostra Nenhuma, o anexo e as imagens da marca para escolher", async () => {
    await expect(pick.getByRole("button", { name: "Nenhuma" })).toHaveAttribute("aria-pressed", "true");
    for (const name of ["print-do-app.png", "logo-agendei", "caixa-do-produto"]) await expect(pick.getByRole("button", { name })).toBeVisible();
  });
  await pick.getByRole("button", { name: "print-do-app.png" }).click();
  await check("escolher a imagem marca o card para atualizar e a prévia já mostra a imagem", async () => {
    await expect(pick.getByRole("button", { name: "print-do-app.png" })).toHaveAttribute("aria-pressed", "true");
    const p = await page.evaluate(async (id) => (await window.pacto.request("bootstrap")).projects.find((x) => x.id === id), attachedId);
    const html = await page.locator(".stage-frame iframe").getAttribute("srcdoc");
    assert.ok(html.includes(p.attachments[0].dataUrl.slice(0, 200)), "prévia sem a imagem");
    await expect.poll(async () => (await page.evaluate(async (id) => (await window.pacto.request("bootstrap")).projects.find((x) => x.id === id), attachedId)).slides[1].asset, { timeout: 8000 }).toBe(p.attachments[0].id);
  });
  await shot(page, "20-imagem-no-card");
  await page.getByRole("button", { name: "Enviar imagem para este card" }).click();
  await check("enviar imagem pelo card anexa ao projeto e já seleciona", async () => {
    await expect(pick.locator("button[aria-pressed=true]")).toHaveAttribute("aria-label", "foto-extra.png");
    const p = await page.evaluate(async (id) => (await window.pacto.request("bootstrap")).projects.find((x) => x.id === id), attachedId);
    assert.equal(p.attachments.length, 2);
  });
  await page.keyboard.press("Escape");
  await page.locator(".topbar .btn.primary").click();
  await check("atualizar monta o card com a imagem escolhida em 1080×1350", async () => {
    await expect(page.getByRole("button", { name: "Ir para publicar" })).toBeVisible({ timeout: 30000 });
    const p = await page.evaluate(async (id) => (await window.pacto.request("bootstrap")).projects.find((x) => x.id === id), attachedId);
    assert.equal(p.slides[1].state, "complete");
    assert.deepEqual(await png1080(page, p.slides[1].image), [1080, 1350]);
  });
  await page.locator(".thumb").nth(1).click();
  await shot(page, "21-card-com-imagem");
  await check("Marca e estúdio com imagens: texto ≥ 13px, sem rolagem aninhada", async () => {
    const a = await audit(page);
    assert.equal(a.smallCount, 0, a.small.join(" | "));
    assert.deepEqual(a.nested, []);
  });

  const failed = results.filter((r) => !r.passed);
  console.log(JSON.stringify({ out, userData, passed: results.length - failed.length, failed: failed.length, results }, null, 2));
  assert.equal(failed.length, 0, "UI phase checks failed");
} finally {
  if (application) await application.evaluate(({ app }) => app.exit(0)).catch(() => {});
  await server.close();
  await rm(userData, { recursive: true, force: true }).catch(() => {});
}

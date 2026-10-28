import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../core/store.mjs";
import { Runtime, ACTIONS } from "../core/runtime.mjs";
import { loadKnowledge } from "../core/knowledge.mjs";
import { palette, marked, fit, slideHtml, documentHtml, imagesPdfHtml, contrast, STYLES } from "../core/templates.mjs";

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH7sAAAAASUVORK5CYII=",
  "base64",
);
const dataUrl = `data:image/png;base64,${png.toString("base64")}`;
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "pacto-studio-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return new Store(root).init();
}
function fakeRender() {
  const calls = [];
  return {
    calls,
    fonts: { archivo500: "file:///a.woff2", archivo800: "file:///b.woff2" },
    async png(html, size) { calls.push({ kind: "png", html, size }); return png; },
    async pdf(html, size) { calls.push({ kind: "pdf", html, size }); return Buffer.from("%PDF-1.7 teste"); },
  };
}
const codex = (connected = true, run = async () => ({ text: "{}", images: [] })) => ({ status: { account: { connected } }, run, cancel: async () => {} });
const slides = [
  { id: "c1", role: "Capa", title: "4 informações que toda confirmação precisa ter", body: "", emphasis: "confirmação" },
  { id: "c2", role: "Passo", title: "Qual dia? Que horas?", body: "Data com dia da semana.", emphasis: "Que horas?" },
];

test("palette reads the Design Kit colors by role and falls back safely", () => {
  const p = palette("Verde-menta #3CC8A0 destaques; grafite #1E2328 títulos; branco #FFFFFF fundo; apoio #F5F7F6");
  assert.equal(p.accent, "#3cc8a0");
  assert.equal(p.ink, "#1e2328");
  assert.equal(p.paper, "#ffffff");
  assert.equal(p.soft, "#f5f7f6");
  assert.deepEqual(palette(""), { accent: "#ff5a36", ink: "#191919", paper: "#ffffff", soft: "#f4f1ec" });
  assert.ok(contrast("#000000", "#ffffff") > 20);
});

test("emphasis marks whole words only and escapes user text", () => {
  assert.equal(marked("Confirma a confirmação", "confirma"), "<mark>Confirma</mark> a confirmação");
  assert.equal(marked("a <b>c</b>", ""), "a &lt;b&gt;c&lt;/b&gt;");
  assert.ok(fit("curto", 90, 50) === 90 && fit("x".repeat(400), 90, 50) === 50);
});

test("every template style renders a 1080×1350 card with the brand and no raw markup", () => {
  const brand = { name: "Agendei", handle: "@agendei.app", verified: true, palette: palette("#3cc8a0 #1e2328 #ffffff") };
  const media = { faces: [{ id: "f1", dataUrl }], scenes: [{ id: "s1", status: "approved", image: dataUrl }] };
  for (const style of STYLES) {
    const html = slideHtml({ style, slide: { ...slides[0], title: "<script>x</script> título" }, brand, media, fonts: {} });
    assert.match(html, /width:1080px/);
    assert.doesNotMatch(html, /<script>x/);
  }
  const tweet = slideHtml({ style: "tweet", slide: slides[1], brand, media, fonts: {} });
  assert.match(tweet, /agendei\.app/);
  assert.match(tweet, /aria-label="verificado"/);
  assert.doesNotMatch(slideHtml({ style: "tweet", slide: slides[1], brand: { ...brand, verified: false }, media, fonts: {} }), /verificado/);
  assert.match(slideHtml({ style: "fototexto", slide: slides[1], brand, media, fonts: {} }), /<img class="photo"/);
  assert.match(slideHtml({ style: "fundo", slide: slides[0], index: 0, brand, media, fonts: {} }), /arrasta pro lado/);
});

test("documents render A4 and 16:9 pages with checklist and steps layouts", () => {
  const pages = [
    { title: "Checklist da confirmação", layout: "cover", body: "Para a recepção", emphasis: "confirmação" },
    { title: "Antes de enviar", layout: "checklist", body: "Data\nHorário\nEndereço" },
    { title: "Como funciona", layout: "steps", body: "Marca — pelo link\nConfirma — sozinho\nLembra — na véspera" },
  ];
  const a4 = documentHtml({ format: "material", pages, brand: { name: "Agendei" }, fonts: {} });
  assert.match(a4, /@page\{size:794px 1123px/);
  assert.equal((a4.match(/<li>/g) || []).length, 3);
  const deck = documentHtml({ format: "apresentacao", pages, brand: { name: "Agendei" }, fonts: {} });
  assert.match(deck, /width:1280px/);
  assert.match(deck, /<i>3<\/i><b>Lembra<\/b>na véspera/);
  const one = documentHtml({ format: "material", pages, brand: {}, fonts: {}, only: 1 });
  assert.equal((one.match(/<section/g) || []).length, 1);
  assert.match(imagesPdfHtml([dataUrl, dataUrl]), /size:1080px 1350px/);
});

test("store keeps format, style and brand media validated", async (t) => {
  const store = await fixture(t);
  await assert.rejects(store.createProject({ title: "A", brief: "B", style: "neon" }), /Estilo inválido/);
  await assert.rejects(store.createProject({ title: "A", brief: "B", format: "planilha" }), /Formato inválido/);
  const doc = await store.createProject({ title: "Material", brief: "B", format: "material", style: "tweet" });
  assert.equal(doc.format, "material");
  assert.equal(doc.style, "ia", "documents never take a carousel style");
  const media = await store.saveMedia({ displayName: "Agendei", handle: "@@agendei app", verified: false, avatar: dataUrl, addFaces: [{ name: "eu.png", dataUrl }], addScenes: [{ label: "Café", prompt: "Xícara" }] });
  assert.equal(media.handle, "agendeiapp");
  assert.equal(media.verified, false);
  assert.equal(media.faces.length, 1);
  assert.equal(media.scenes[0].status, "pending");
  await store.saveMedia({ scene: { id: media.scenes[0].id, status: "approved" } });
  assert.equal(store.media().scenes[0].status, "approved");
  await assert.rejects(store.saveMedia({ scene: { id: media.scenes[0].id, status: "talvez" } }), /Situação inválida/);
  await assert.rejects(store.saveMedia({ avatar: "data:text/html;base64,AAAA" }), /PNG, JPEG ou WebP/);
  await assert.rejects(store.saveMedia({ senha: "x" }), /não permitido/);
  await store.saveMedia({ removeFace: media.faces[0].id });
  assert.equal(store.media().faces.length, 0);
});

test("template styles render covers and cards without the AI and without a connected account", async (t) => {
  const store = await fixture(t);
  const render = fakeRender();
  const knowledge = await loadKnowledge(join(process.cwd(), "resources", "pacto"));
  let calls = 0;
  const runtime = new Runtime({ store, knowledge, codex: codex(false, async () => { calls++; return { text: "{}", images: [] }; }), dialogs: { render } });
  await store.saveProfile({ brand: "Agendei", designKit: "#3CC8A0 #1E2328 #FFFFFF" });
  const p = await store.createProject({ title: "Confirmação", brief: "B", style: "tweet" });
  await store.saveProject({ id: p.id, slides });
  await runtime.request("approveText", { id: p.id });
  const covered = await runtime.request("generateCovers", { id: p.id });
  assert.equal(covered.coverOptions.length, 3);
  assert.deepEqual(covered.coverOptions.map((o) => o.variant), [0, 1, 2]);
  const done = await runtime.request("chooseCover", { id: p.id, optionId: covered.coverOptions[1].id });
  assert.equal(done.styleVariant, 1);
  assert.ok(done.slides.every((s) => s.image && s.state === "complete"));
  assert.equal(done.status, "complete");
  assert.equal(calls, 0, "template styles never call the model");
  assert.ok(render.calls.every((c) => c.size.width === 1080 && c.size.height === 1350));
  // Changing the style clears the art and asks for a cover again.
  const restyled = await runtime.request("saveProject", { id: p.id, style: "texto" });
  assert.equal(restyled.style, "texto");
  assert.ok(restyled.slides.every((s) => !s.image));
  assert.equal(restyled.coverOptions.length, 0);
  // Photo styles need the buyer's own photos first.
  await runtime.request("saveProject", { id: p.id, style: "fundo" });
  await assert.rejects(runtime.request("generateCovers", { id: p.id }), /foto com o seu rosto/);
});

test("documents plan pages, render cover options and export a PDF", async (t) => {
  const store = await fixture(t);
  const render = fakeRender();
  const knowledge = await loadKnowledge(join(process.cwd(), "resources", "pacto"));
  const prompts = [];
  const plan = { title: "Checklist da confirmação perfeita", caption: "Seu material", reply: "Confira os itens.", pages: [
    { id: "p 1", layout: "cover", role: "Material gratuito", title: "Checklist da confirmação", body: "Para clínicas", emphasis: "confirmação" },
    { id: "p2", layout: "checklist", role: "Checklist", title: "Antes de enviar", body: "Data\nHorário", emphasis: "" },
    { id: "p3", layout: "inventado", role: "Próximo passo", title: "Responda AGENDA", body: "Mostro como fica.", emphasis: "" },
  ] };
  const runtime = new Runtime({ store, knowledge, codex: codex(true, async (args) => { prompts.push(args); return { text: JSON.stringify(plan), images: [] }; }), dialogs: { render, savePdf: async (_p, bytes) => ({ path: "x.pdf", size: bytes.length }) } });
  const carousel = await store.createProject({ title: "Carrossel", brief: "B" });
  await store.saveProject({ id: carousel.id, slides });
  const doc = await runtime.request("createProject", { title: "Material", brief: "Checklist", format: "material", sourceId: carousel.id });
  await runtime.request("generatePlan", { id: doc.id });
  for (let i = 0; i < 200 && runtime.job; i++) await new Promise((r) => setTimeout(r, 5));
  const planned = store.get(doc.id);
  assert.equal(planned.slides.length, 3);
  assert.equal(planned.slides[2].layout, "text", "unknown layouts fall back to text");
  assert.match(planned.slides[0].id, /^[\w-]+$/);
  assert.equal(prompts[0].outputSchema.required.includes("pages"), true);
  assert.match(prompts[0].prompt, /MATERIAL GRATUITO/);
  assert.match(prompts[0].prompt, /CARROSSEL QUE PEDE ESTE MATERIAL/);
  await assert.rejects(runtime.request("exportPdf", { id: doc.id }), /Aprove o roteiro/);
  await runtime.request("approveText", { id: doc.id });
  const covers = await runtime.request("generateCovers", { id: doc.id });
  assert.equal(covers.coverOptions.length, 3);
  assert.deepEqual(render.calls.at(-1).size, { width: 794, height: 1123 });
  await runtime.request("chooseCover", { id: doc.id, optionId: covers.coverOptions[2].id });
  const saved = await runtime.request("exportPdf", { id: doc.id });
  assert.equal(saved.path, "x.pdf");
  assert.equal(render.calls.at(-1).kind, "pdf");
  assert.match(render.calls.at(-1).html, /page v2|cover v2/);
  await assert.rejects(runtime.request("generateSlides", { id: doc.id }), /Documentos/);
  assert.ok(ACTIONS.includes("exportPdf") && ACTIONS.includes("saveMedia"));
});

test("Texto + foto varies photos of the same environment across cards", async (t) => {
  const { scenePhoto } = await import("../core/templates.mjs");
  const media = { scenes: [{ id: "s1", status: "approved", image: "a", images: ["a", "b", "c"] }, { id: "s2", status: "pending", images: ["z"] }] };
  assert.deepEqual([0, 1, 2, 3].map((i) => scenePhoto(media, "", i)), ["a", "b", "c", "a"]);
  assert.equal(scenePhoto(media, "s1#2", 0), "c");
  assert.equal(scenePhoto(media, "s2", 0), "a", "pending scenes are never used");
  const store = await fixture(t);
  const m = await store.saveMedia({ addScenes: [{ label: "Café", prompt: "Mesa" }] });
  const id = m.scenes[0].id;
  for (let i = 0; i < 3; i++) await store.saveMedia({ scene: { id, status: "approved", addImage: dataUrl } });
  assert.equal(store.media().scenes[0].images.length, 3);
  assert.equal(store.media().scenes[0].image, dataUrl);
  await store.saveMedia({ scene: { id, removeImage: 0 } });
  assert.equal(store.media().scenes[0].images.length, 2);
});

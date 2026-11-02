import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { crc32, deflateSync } from "node:zlib";
import { Store } from "../core/store.mjs";
import { Runtime, PLAN_SCHEMA } from "../core/runtime.mjs";
import { slideHtml, palette } from "../core/templates.mjs";

// Imagens da marca (logo, produtos) e anexos do carrossel: o texto escolhe o card,
// a arte com IA recebe a imagem certa e os estilos prontos a mostram no card.
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH7sAAAAASUVORK5CYII=", "base64");
const dataUrl = `data:image/png;base64,${png.toString("base64")}`;
// Um segundo PNG válido, com outro pixel, para distinguir as imagens nas asserções.
function pixel(gray) {
  const chunk = (type, data) => { const body = Buffer.concat([Buffer.from(type), data]); const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body)); return Buffer.concat([len, body, crc]); };
  const ihdr = Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 0, 0, 0, 0]);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", deflateSync(Buffer.from([0, gray]))), chunk("IEND", Buffer.alloc(0))]);
}
const other = `data:image/png;base64,${pixel(200).toString("base64")}`;
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "pacto-images-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return new Store(root).init();
}
const settle = async (runtime) => { for (let i = 0; i < 200 && runtime.job; i++) await new Promise((r) => setTimeout(r, 5)); };
const knowledge = { method: "Método", lessons: [] };
const fakeRender = () => ({ calls: [], fonts: {}, async png(html) { this.calls.push(html); return png; }, async pdf() { return Buffer.from("%PDF"); } });
const deferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};
const waitFor = async (condition) => {
  for (let i = 0; i < 200 && !condition(); i += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
  assert.ok(condition());
};
const planFor = (cards) => ({
  title: "T",
  architecture: "Lista Útil",
  editorialLine: "",
  visualConcept: "",
  coverHooks: [],
  caption: "",
  reply: "ok",
  regenerateSlideIds: [],
  slides: cards,
});
const card = (id, title) => ({ id, role: id === "one" ? "Capa" : "Conteúdo", title, body: `Texto ${id}`, emphasis: "", visual: "v", prompt: "", asset: "" });

test("resize during art waits for cancellation, adapts ids and generates only pending cards", async (t) => {
  const store = await fixture(t);
  const p = await store.createProject({ title: "A", brief: "B", cardCount: 2 });
  const initial = [card("one", "Capa"), card("two", "Dois")];
  await store.saveProject({ id: p.id, slides: initial });
  await store.addImage(p.id, "one", png);
  await store.update(p.id, { textApproved: true });
  const oldArt = deferred();
  const prompts = [];
  let runs = 0;
  let cancels = 0;
  const runtime = new Runtime({
    store,
    knowledge,
    codex: {
      status: { account: { connected: true } },
      cancel: () => {
        cancels += 1;
        oldArt.resolve({ images: [pixel(220)] });
      },
      run: async (options) => {
        prompts.push(options.prompt);
        runs += 1;
        if (runs === 1) return oldArt.promise;
        if (runs === 2) return { text: JSON.stringify(planFor([...initial, card("three", "Três")])) };
        return { images: [png] };
      },
    },
  });
  await runtime.request("generateSlides", { id: p.id });
  await waitFor(() => runs === 1);
  await runtime.request("resizeCarousel", { id: p.id, cardCount: 3 });
  await settle(runtime);
  const current = store.get(p.id);
  assert.equal(cancels, 1);
  assert.equal(runs, 4);
  assert.match(prompts[1], /preserve IDs e conteúdo não afetado/);
  assert.deepEqual(current.slides.map((slide) => slide.id), ["one", "two", "three"]);
  assert.ok(current.slides.every((slide) => slide.image && slide.state === "complete"));
  assert.deepEqual(current.slides.map((slide) => slide.versions.length), [1, 1, 1]);
  const versions = current.slides.map((slide) => slide.versions.map((version) => version.file));
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(store.get(p.id).slides.map((slide) => slide.versions.map((version) => version.file)), versions, "cancelled art must not write late");
});

test("reducing four cards to two preserves art without redrawing kept cards", async (t) => {
  const store = await fixture(t);
  const p = await store.createProject({ title: "A", brief: "B", cardCount: 4 });
  const initial = [card("one", "Capa"), card("two", "Dois"), card("three", "Três"), card("four", "Quatro")];
  await store.saveProject({ id: p.id, slides: initial });
  await store.addImage(p.id, "one", png);
  await store.addImage(p.id, "two", png);
  await store.update(p.id, { textApproved: true });
  const keptImages = store.get(p.id).slides.slice(0, 2).map((slide) => slide.image);
  const oldArt = deferred();
  let runs = 0;
  const runtime = new Runtime({
    store,
    knowledge,
    codex: {
      status: { account: { connected: true } },
      cancel: () => oldArt.resolve({ images: [pixel(220)] }),
      run: async () => {
        runs += 1;
        if (runs === 1) return oldArt.promise;
        if (runs === 2) return { text: JSON.stringify(planFor(initial.slice(0, 2))) };
        return { images: [png] };
      },
    },
  });
  await runtime.request("generateSlides", { id: p.id });
  await waitFor(() => runs === 1);
  await runtime.request("resizeCarousel", { id: p.id, cardCount: 2 });
  await settle(runtime);
  const current = store.get(p.id);
  assert.equal(runs, 2, "only cancelled art and text adaptation should call Codex");
  assert.deepEqual(current.slides.map((slide) => slide.id), ["one", "two"]);
  assert.deepEqual(current.slides.map((slide) => slide.image), keptImages);
  assert.deepEqual(current.slides.map((slide) => slide.versions.length), [1, 1]);
  assert.ok(current.slides.every((slide) => slide.state === "complete"));
});

test("a one-card carousel goes through approval, cover art and export", async (t) => {
  const store = await fixture(t);
  const p = await store.createProject({ title: "A", brief: "B", cardCount: 4 });
  let exported;
  const runtime = new Runtime({
    store,
    knowledge,
    codex: {
      status: { account: { connected: true } },
      run: async (options) => options.outputSchema === PLAN_SCHEMA
        ? { text: JSON.stringify(planFor([card("only", "Um card")])) }
        : { images: [png] },
    },
    dialogs: { export: async (_project, bytes) => { exported = bytes; return { ok: true }; } },
  });
  await runtime.request("resizeCarousel", { id: p.id, cardCount: 1 });
  await runtime.request("generatePlan", { id: p.id });
  await settle(runtime);
  assert.equal(store.get(p.id).slides.length, 1);
  await runtime.request("approveText", { id: p.id });
  assert.equal(store.get(p.id).textApproved, true);
  await runtime.request("generateCovers", { id: p.id, count: 1 });
  await settle(runtime);
  const optionId = store.get(p.id).coverOptions[0].id;
  await runtime.request("chooseCover", { id: p.id, optionId });
  assert.equal(store.get(p.id).slides[0].state, "complete");
  await runtime.request("export", { id: p.id });
  const { unzipSync } = await import("fflate");
  assert.deepEqual(Object.keys(unzipSync(exported)).sort(), ["01.png", "legenda.txt"]);
});

test("same configured count does not cancel images, covers or a card correction", async (t) => {
  for (const kind of ["images", "covers", "correction"]) {
    const store = await fixture(t);
    const p = await store.createProject({ title: "A", brief: "B", cardCount: 2 });
    await store.saveProject({ id: p.id, slides: [card("one", "Capa"), card("two", "Dois")] });
    await store.addImage(p.id, "one", png);
    if (kind === "correction") await store.addImage(p.id, "two", png);
    await store.update(p.id, { textApproved: true });
    const turn = deferred();
    let runs = 0;
    let cancels = 0;
    const runtime = new Runtime({
      store,
      knowledge,
      codex: {
        status: { account: { connected: true } },
        cancel: () => {
          cancels += 1;
          turn.resolve({ images: [png] });
        },
        run: async () => {
          runs += 1;
          return turn.promise;
        },
      },
    });
    const action = kind === "covers" ? "generateCovers" : "generateSlides";
    const args = kind === "covers" ? { id: p.id, count: 1 } : kind === "correction"
      ? { id: p.id, slideId: "two", fix: { problems: ["Título pequeno"], note: "" } }
      : { id: p.id };
    await runtime.request(action, args);
    await waitFor(() => runs === 1);
    const job = runtime.job;
    const status = store.get(p.id).status;
    try {
      await runtime.request("resizeCarousel", { id: p.id, cardCount: 2 });
      assert.equal(cancels, 0, kind);
      assert.strictEqual(runtime.job, job, kind);
      assert.equal(store.get(p.id).status, status, kind);
    } finally {
      turn.resolve({ images: [png] });
      if (runtime.job) await runtime.request("cancel", { id: p.id });
      await settle(runtime);
    }
  }
});

test("template slide rendering is tracked and cannot write after resize", async (t) => {
  const store = await fixture(t);
  const p = await store.createProject({ title: "A", brief: "B", cardCount: 2, style: "tweet" });
  const initial = [card("one", "Capa"), card("two", "Dois")];
  await store.saveProject({ id: p.id, slides: initial });
  await store.addImage(p.id, "one", png);
  await store.update(p.id, { textApproved: true });
  const oldRender = deferred();
  const prompts = [];
  const render = {
    calls: [], fonts: {},
    async png(html) {
      this.calls.push(html);
      return this.calls.length === 1 ? oldRender.promise : png;
    },
  };
  const runtime = new Runtime({
    store, knowledge,
    codex: {
      status: { account: { connected: true } },
      cancel: () => {},
      run: async (options) => {
        prompts.push(options.prompt);
        return { text: JSON.stringify(planFor([...initial, card("three", "Três")])) };
      },
    },
    dialogs: { render },
  });
  const generating = runtime.request("generateSlides", { id: p.id });
  await waitFor(() => render.calls.length === 1);
  let resizing;
  try {
    resizing = runtime.request("resizeCarousel", { id: p.id, cardCount: 3 });
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(prompts.length, 0, "adaptation must wait for the old renderer");
    oldRender.resolve(pixel(220));
    await Promise.all([generating, resizing]);
    await settle(runtime);
    const current = store.get(p.id);
    assert.deepEqual(current.slides.map((slide) => slide.id), ["one", "two", "three"]);
    assert.deepEqual(current.slides.map((slide) => slide.versions.length), [1, 1, 1]);
    assert.notEqual(current.slides[1].image, `data:image/png;base64,${pixel(220).toString("base64")}`);
    assert.ok(current.slides.every((slide) => slide.state === "complete"));
  } finally {
    oldRender.resolve(pixel(220));
    await Promise.allSettled([generating, ...(resizing ? [resizing] : [])]);
    await settle(runtime);
  }
});

test("template cover rendering is tracked and cannot add a late option", async (t) => {
  const store = await fixture(t);
  const p = await store.createProject({ title: "A", brief: "B", cardCount: 2, style: "tweet" });
  const initial = [card("one", "Capa"), card("two", "Dois")];
  await store.saveProject({ id: p.id, slides: initial });
  await store.addImage(p.id, "one", png);
  await store.addImage(p.id, "two", png);
  await store.update(p.id, { textApproved: true });
  const oldRender = deferred();
  const prompts = [];
  const render = {
    calls: [], fonts: {},
    async png(html) {
      this.calls.push(html);
      return this.calls.length === 1 ? oldRender.promise : png;
    },
  };
  const runtime = new Runtime({
    store, knowledge,
    codex: {
      status: { account: { connected: true } },
      cancel: () => {},
      run: async (options) => {
        prompts.push(options.prompt);
        return { text: JSON.stringify(planFor([...initial, card("three", "Três")])) };
      },
    },
    dialogs: { render },
  });
  const generating = runtime.request("generateCovers", { id: p.id });
  await waitFor(() => render.calls.length === 1);
  let resizing;
  try {
    resizing = runtime.request("resizeCarousel", { id: p.id, cardCount: 3 });
    await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(prompts.length, 0, "adaptation must wait for the old cover renderer");
    oldRender.resolve(pixel(220));
    await Promise.all([generating, resizing]);
    await settle(runtime);
    const current = store.get(p.id);
    assert.deepEqual(current.slides.map((slide) => slide.id), ["one", "two", "three"]);
    assert.deepEqual(current.slides.map((slide) => slide.versions.length), [1, 1, 1]);
    assert.equal(current.coverOptions.length, 0, "cancelled cover must not be appended late");
  } finally {
    oldRender.resolve(pixel(220));
    await Promise.allSettled([generating, ...(resizing ? [resizing] : [])]);
    await settle(runtime);
  }
});

test("resize adaptation rejects empty and divergent card counts without replacing prior cards", async (t) => {
  const initial = [card("one", "Capa"), card("two", "Dois")];
  const responses = [
    ["empty", []],
    ["too few", initial.slice(0, 1)],
    ["too many", [...initial, card("three", "Três"), card("four", "Quatro")]],
  ];
  for (const textApproved of [false, true]) {
    for (const [label, responseSlides] of responses) {
      const store = await fixture(t);
      const p = await store.createProject({ title: "A", brief: "B", cardCount: 2 });
      await store.saveProject({ id: p.id, slides: initial });
      if (textApproved) await store.addImage(p.id, "one", png);
      await store.update(p.id, { textApproved });
      const before = store.get(p.id).slides;
      let runs = 0;
      const runtime = new Runtime({
        store, knowledge,
        codex: {
          status: { account: { connected: true } },
          cancel: () => {},
          run: async () => {
            runs += 1;
            return { text: JSON.stringify(planFor(responseSlides)) };
          },
        },
      });
      await runtime.request("resizeCarousel", { id: p.id, cardCount: 3 });
      await settle(runtime);
      const current = store.get(p.id);
      assert.equal(current.status, "error", `${label}, approved=${textApproved}`);
      assert.match(current.error, /exatamente 3 cards/, `${label}, approved=${textApproved}`);
      assert.deepEqual(current.slides.map((slide) => slide.id), before.map((slide) => slide.id), `${label}, approved=${textApproved}`);
      assert.deepEqual(current.slides.map((slide) => slide.image), before.map((slide) => slide.image), `${label}, approved=${textApproved}`);
      assert.deepEqual(current.slides.map((slide) => slide.versions?.length || 0), before.map((slide) => slide.versions?.length || 0), `${label}, approved=${textApproved}`);
      assert.equal(current.textApproved, textApproved, `${label}, approved=${textApproved}`);
      assert.equal(runs, 1, `${label}, approved=${textApproved}: no art may resume`);
    }
  }
});

test("brand images are validated, typed, renamed and removed; old libraries gain an empty list", async (t) => {
  const store = await fixture(t);
  assert.deepEqual(store.media().assets, []);
  let media = await store.saveMedia({ addAssets: [{ name: "Logo", dataUrl, kind: "logo" }, { name: "Caixa do produto", dataUrl, kind: "produto" }] });
  assert.deepEqual(media.assets.map((a) => [a.name, a.kind]), [["Logo", "logo"], ["Caixa do produto", "produto"]]);
  media = await store.saveMedia({ asset: { id: media.assets[1].id, name: "Kit completo", kind: "outro" } });
  assert.equal(media.assets[1].name, "Kit completo");
  assert.equal(media.assets[1].kind, "outro");
  await assert.rejects(store.saveMedia({ addAssets: [{ name: "x", dataUrl, kind: "famoso" }] }), /Tipo de imagem/);
  await assert.rejects(store.saveMedia({ addAssets: [{ name: "x", dataUrl: "data:image/png;base64,AAAA" }] }), /PNG/);
  await assert.rejects(store.saveMedia({ addAssets: Array.from({ length: 11 }, () => ({ name: "p", dataUrl, kind: "produto" })) }), /doze/);
  media = await store.saveMedia({ removeAsset: media.assets[0].id });
  assert.equal(media.assets.length, 1);
});

test("attachments are saved with the project, editable, limited and kept out of the text prompt bytes", async (t) => {
  const store = await fixture(t);
  const p = await store.createProject({ title: "Oferta", brief: "Mostrar o kit", attachments: [{ name: "kit.png", dataUrl }] });
  assert.equal(p.attachments.length, 1);
  assert.match(p.attachments[0].id, /^[a-f0-9-]{36}$/);
  await assert.rejects(store.createProject({ title: "x", brief: "y", attachments: Array.from({ length: 7 }, () => ({ name: "a", dataUrl })) }), /seis/);
  const saved = await store.saveProject({ id: p.id, attachments: [...p.attachments, { name: "print.png", dataUrl: other }] });
  assert.equal(saved.attachments.length, 2);
  assert.equal(saved.attachments[0].id, p.attachments[0].id);
});

test("the plan sees the attachments, assigns one to a card and drops ids that do not exist", async (t) => {
  const store = await fixture(t);
  await store.saveMedia({ addAssets: [{ name: "Logo Agendei", dataUrl, kind: "logo" }] });
  const p = await store.createProject({ title: "Oferta", brief: "Quero o produto no card da oferta", attachments: [{ name: "produto.png", dataUrl }] });
  const kit = p.attachments[0].id;
  assert.ok(PLAN_SCHEMA.properties.slides.items.required.includes("asset"));
  const plan = { title: "T", architecture: "Lista Útil", editorialLine: "", visualConcept: "", coverHooks: [], caption: "c", reply: "ok", regenerateSlideIds: [], slides: [
    { id: "a", role: "Capa", title: "Capa", body: "", emphasis: "", visual: "v", prompt: "", asset: "inventado" },
    { id: "b", role: "Oferta", title: "Conheça o kit", body: "Tudo em uma caixa.", emphasis: "", visual: "v", prompt: "", asset: kit },
  ] };
  const calls = [];
  const runtime = new Runtime({ store, knowledge, codex: { status: { account: { connected: true } }, run: async (o) => { calls.push(o); return { text: JSON.stringify(plan) }; } } });
  await runtime.request("generatePlan", { id: p.id });
  await settle(runtime);
  assert.match(calls[0].prompt, /IMAGENS DISPONÍVEIS PARA OS CARDS/);
  assert.match(calls[0].prompt, new RegExp(`${kit} — produto.png — anexada a este carrossel`));
  assert.match(calls[0].prompt, /Logo Agendei — logo/);
  assert.deepEqual(calls[0].references, [dataUrl]);
  assert.doesNotMatch(calls[0].prompt, /base64/);
  const saved = store.get(p.id);
  assert.equal(saved.slides[0].asset, "");
  assert.equal(saved.slides[1].asset, kit);
});

test("AI art puts the card image first among the brand references, with a legend, and changing it outdates the art", async (t) => {
  const store = await fixture(t);
  await store.saveMedia({ addAssets: [{ name: "Logo", dataUrl, kind: "logo" }] });
  const p = await store.createProject({ title: "A", brief: "B", attachments: [{ name: "produto.png", dataUrl: other }, { name: "estilo.png", dataUrl }] });
  const [product, style] = p.attachments;
  await store.saveProject({ id: p.id, slides: [{ id: "one", title: "Capa", body: "", visual: "v" }, { id: "two", title: "Oferta", body: "Kit", visual: "v", asset: product.id }] });
  await store.addImage(p.id, "one", png);
  await store.update(p.id, { textApproved: true });
  const calls = [];
  const runtime = new Runtime({ store, knowledge, codex: { status: { account: { connected: true } }, run: async (o) => { calls.push(o); return { images: [png] }; } } });
  await runtime.request("generateSlides", { id: p.id });
  await settle(runtime);
  assert.equal(calls.length, 1);
  const { prompt, references } = calls[0];
  assert.match(prompt, /1\. capa aprovada/);
  assert.match(prompt, /2\. IMAGEM QUE DEVE APARECER NESTE CARD \("produto.png"\)/);
  assert.match(prompt, /3\. logotipo oficial da marca/);
  assert.match(prompt, /4\. referência anexada ao carrossel \("estilo.png"\)/);
  assert.equal(references.length, 4);
  assert.equal(references[1], product.dataUrl);
  const current = store.get(p.id);
  const changed = await store.saveProject({ id: p.id, slides: current.slides.map((s) => (s.id === "two" ? { ...s, asset: "" } : s)) });
  assert.equal(changed.slides[1].state, "outdated");
  assert.ok(style.id);
});

test("template styles show the card image; logos are not cropped", async (t) => {
  const brand = { name: "Agendei", handle: "agendei", verified: true, palette: palette("#3cc8a0 #1e2328 #ffffff") };
  const slide = { id: "b", title: "Conheça o kit", body: "Tudo numa caixa", emphasis: "", assetImage: other, assetKind: "produto" };
  for (const style of ["tweet", "texto", "textopreto", "fototexto", "fundo"]) assert.ok(slideHtml({ style, slide, brand, media: {}, fonts: {} }).includes(other), style);
  assert.match(slideHtml({ style: "tweet", slide: { ...slide, assetKind: "logo" }, brand, media: {}, fonts: {} }), /class="media contain"/);
  assert.doesNotMatch(slideHtml({ style: "texto", slide: { ...slide, assetImage: "" }, brand, media: {}, fonts: {} }), /class="media/);

  const store = await fixture(t);
  const p = await store.createProject({ title: "A", brief: "B", style: "tweet", attachments: [{ name: "kit.png", dataUrl: other }] });
  await store.saveProject({ id: p.id, slides: [{ id: "one", title: "Capa" }, { id: "two", title: "Oferta", asset: p.attachments[0].id }] });
  await store.update(p.id, { textApproved: true });
  const render = fakeRender();
  const runtime = new Runtime({ store, knowledge, codex: { status: { account: { connected: false } }, run: async () => ({}) }, dialogs: { render } });
  await runtime.request("generateCovers", { id: p.id });
  const cover = store.get(p.id).coverOptions[0].id;
  await runtime.request("chooseCover", { id: p.id, optionId: cover });
  const offer = render.calls.find((html) => html.includes("Oferta"));
  assert.ok(offer.includes(other));
});

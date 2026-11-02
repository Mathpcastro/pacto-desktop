import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../core/store.mjs";
import { Runtime } from "../core/runtime.mjs";
import { loadKnowledge } from "../core/knowledge.mjs";
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH7sAAAAASUVORK5CYII=",
  "base64",
);
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "pacto-value-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return new Store(root).init();
}
const settle = async (runtime) => {
  for (let i = 0; i < 200 && runtime.job; i++)
    await new Promise((r) => setTimeout(r, 5));
};
const slides = [
  { id: "one", role: "Capa", title: "A", body: "B" },
  { id: "two", role: "CTA", title: "C", body: "D" },
];
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
  architecture: "Tutorial",
  editorialLine: "",
  visualConcept: "",
  coverHooks: [],
  caption: "",
  reply: "ok",
  regenerateSlideIds: [],
  slides: cards,
});

test("resize during plan waits for the cancelled turn and restarts with one card", async (t) => {
  const store = await fixture(t);
  const p = await store.createProject({ title: "A", brief: "B", cardCount: 4 });
  const oldTurn = deferred();
  const prompts = [];
  let runs = 0;
  let cancels = 0;
  const runtime = new Runtime({
    store,
    knowledge: { method: "M", lessons: [] },
    codex: {
      status: { account: { connected: true } },
      cancel: () => {
        cancels += 1;
        oldTurn.resolve({ text: JSON.stringify(planFor(slides)) });
      },
      run: async (options) => {
        prompts.push(options.prompt);
        runs += 1;
        if (runs === 1) return oldTurn.promise;
        return { text: JSON.stringify(planFor([{ id: "only", role: "Capa", title: "Um card", body: "Completo" }])) };
      },
    },
  });
  await runtime.request("generatePlan", { id: p.id });
  await waitFor(() => prompts.length === 1);
  await runtime.request("resizeCarousel", { id: p.id, cardCount: 1 });
  await settle(runtime);
  assert.equal(cancels, 1);
  assert.equal(prompts.length, 2);
  assert.match(prompts.at(-1), /exatamente 1 cards/);
  assert.equal(store.get(p.id).cardCount, 1);
  assert.deepEqual(store.get(p.id).slides.map((slide) => slide.id), ["only"]);
});

test("concurrent resize requests reject the second before mixing count, prompt and slides", async (t) => {
  const store = await fixture(t);
  const p = await store.createProject({ title: "A", brief: "B", cardCount: 2 });
  const oldTurn = deferred();
  const prompts = [];
  let runs = 0;
  const runtime = new Runtime({
    store,
    knowledge: { method: "M", lessons: [] },
    codex: {
      status: { account: { connected: true } },
      cancel: () => oldTurn.resolve({ text: JSON.stringify(planFor(slides)) }),
      run: async (options) => {
        prompts.push(options.prompt);
        runs += 1;
        if (runs === 1) return oldTurn.promise;
        const next = Number(options.prompt.match(/A pessoa mudou o tamanho para exatamente (\d+) cards/)?.[1] || 3);
        const cards = Array.from({ length: next }, (_, index) => slides[index] || { id: ["three", "four"][index - 2], role: "Conteúdo", title: `Card ${index + 1}`, body: "Texto" });
        return { text: JSON.stringify(planFor(cards)) };
      },
    },
  });
  await runtime.request("generatePlan", { id: p.id });
  await waitFor(() => runs === 1);
  const results = await Promise.allSettled([
    runtime.request("resizeCarousel", { id: p.id, cardCount: 3 }),
    runtime.request("resizeCarousel", { id: p.id, cardCount: 4 }),
  ]);
  await settle(runtime);
  assert.deepEqual(results.map((result) => result.status), ["fulfilled", "rejected"]);
  assert.match(results[1].reason.message, /Aguarde ou cancele/);
  assert.equal(store.get(p.id).cardCount, 3);
  assert.equal(store.get(p.id).slides.length, 3);
  assert.match(prompts.at(-1), /QUANTIDADE DE CARDS: exatamente 3 cards/);
});

test("same configured count does not cancel plan or message work", async (t) => {
  for (const kind of ["plan", "message"]) {
    const store = await fixture(t);
    const p = await store.createProject({ title: "A", brief: "B", cardCount: 2 });
    if (kind === "message") await store.saveProject({ id: p.id, slides });
    const turn = deferred();
    let runs = 0;
    let cancels = 0;
    const runtime = new Runtime({
      store,
      knowledge: { method: "M", lessons: [] },
      codex: {
        status: { account: { connected: true } },
        cancel: () => {
          cancels += 1;
          turn.resolve({ text: JSON.stringify(planFor(slides)) });
        },
        run: async () => {
          runs += 1;
          return turn.promise;
        },
      },
    });
    await runtime.request(kind === "plan" ? "generatePlan" : "sendMessage", kind === "plan" ? { id: p.id } : { id: p.id, text: "Revise" });
    await waitFor(() => runs === 1);
    const job = runtime.job;
    const status = store.get(p.id).status;
    try {
      await runtime.request("resizeCarousel", { id: p.id, cardCount: 2 });
      assert.equal(cancels, 0, kind);
      assert.strictEqual(runtime.job, job, kind);
      assert.equal(store.get(p.id).status, status, kind);
    } finally {
      turn.resolve({ text: JSON.stringify(planFor(slides)) });
      if (runtime.job) await runtime.request("cancel", { id: p.id });
      await settle(runtime);
    }
  }
});

test("every card count from automatic through 10 is validated and persisted", async (t) => {
  const store = await fixture(t);
  for (let cardCount = 0; cardCount <= 10; cardCount += 1) {
    const p = await store.createProject({ title: `Projeto ${cardCount}`, brief: "B", cardCount });
    assert.equal(p.cardCount, cardCount);
  }
  for (const invalid of [-1, 1.5, 11, "abc"]) {
    await assert.rejects(
      store.createProject({ title: "Inválido", brief: "B", cardCount: invalid }),
      /cards inválida/,
    );
  }
});

test("card count is sent to the copy prompt", async (t) => {
  const store = await fixture(t);
  const p = await store.createProject({ title: "A", brief: "B", cardCount: 4 });
  const prompts = [];
  const plan = {
    title: "T",
    architecture: "Tutorial",
    editorialLine: "",
    visualConcept: "",
    coverHooks: [],
    caption: "",
    reply: "ok",
    regenerateSlideIds: [],
    slides: [],
  };
  const runtime = new Runtime({
    store,
    knowledge: { method: "M", lessons: [] },
    codex: {
      status: { account: { connected: true } },
      run: async (o) => {
        prompts.push(o.prompt);
        return {
          text: JSON.stringify({ ...plan, reply: "Quem é o público?" }),
        };
      },
    },
  });
  await runtime.request("generatePlan", { id: p.id });
  await settle(runtime);
  assert.match(prompts[0], /exatamente 4 cards/);
  assert.match(prompts[0], /QUANTIDADE DE CARDS: exatamente 4/);
  await store.saveProject({ id: p.id, cardCount: 0 });
  assert.equal(store.get(p.id).cardCount, 0);
});

test("publishing and results are recorded without inference; replicate reuses them", async (t) => {
  const store = await fixture(t);
  const p = await store.createProject({ title: "A", brief: "B" });
  await store.saveProject({ id: p.id, slides });
  let calls = 0;
  const runtime = new Runtime({
    store,
    knowledge: loadKnowledge(),
    codex: {
      status: { account: { connected: true } },
      cancel: async () => {},
      run: async () => {
        calls++;
        return {
          text: JSON.stringify({
            analysis: "m",
            ideas: [
              {
                theme: "t",
                hook: "h",
                why: "w",
                deliverable: "d",
                connection: "c",
                architecture: "Tutorial",
                group: "Variação próxima",
                top: false,
                reason: "r",
              },
            ],
          }),
        };
      },
    },
  });
  await assert.rejects(
    runtime.request("replicate", { id: p.id }),
    /Registre o resultado/,
  );
  await runtime.request("markPublished", { id: p.id });
  assert.ok(store.get(p.id).publishedAt);
  await runtime.request("recordResults", {
    id: p.id,
    comments: 10,
    saves: 40,
    sales: 1,
  });
  assert.deepEqual(
    { ...store.get(p.id).results, recordedAt: undefined },
    { comments: 10, saves: 40, sales: 1, recordedAt: undefined },
  );
  assert.equal(calls, 0, "recording results never calls the model");
  await assert.rejects(
    runtime.request("recordResults", { id: p.id, saves: -1 }),
    /inválido/,
  );
  await runtime.request("replicate", { id: p.id });
  assert.equal(calls, 1);
  await runtime.request("markPublished", { id: p.id, published: false });
  assert.equal(store.get(p.id).publishedAt, "");
});

test("settings are validated and persisted", async (t) => {
  const store = await fixture(t);
  assert.equal(store.state().settings.weeklyGoal, 5);
  await store.saveSettings({
    weeklyGoal: 12,
    driveFolder: "G:\\Meu Drive\\PACTO",
  });
  const again = await new Store(store.root).init();
  assert.equal(again.state().settings.weeklyGoal, 12);
  await assert.rejects(store.saveSettings({ weeklyGoal: 0 }), /Meta/);
  await assert.rejects(store.saveSettings({ hack: true }), /não permitida/);
});

test("course moments stay inside each lesson and open YouTube at the estimated second", async (t) => {
  const knowledge = loadKnowledge();
  assert.ok(knowledge.moments.length >= 10);
  for (const m of knowledge.moments) {
    const lesson = knowledge.lessons.find((l) => l.id === m.lessonId);
    assert.ok(
      lesson &&
        m.seconds >= 0 &&
        m.seconds < lesson.durationSeconds &&
        m.approximate,
      m.step,
    );
  }
  const opened = [];
  const store = await fixture(t);
  const runtime = new Runtime({
    store,
    knowledge,
    codex: { status: { account: { connected: false } } },
    dialogs: { openCourse: async (url) => opened.push(url) },
  });
  await runtime.request("openCourse", { step: "cta" });
  const moment = knowledge.moments.find((m) => m.step === "cta");
  assert.equal(
    opened[0],
    `https://www.youtube.com/watch?v=${moment.lessonId}&t=${moment.seconds}s`,
  );
  await assert.rejects(
    runtime.request("openCourse", { step: "inexistente" }),
    /não encontrada/,
  );
  assert.equal(runtime.state().courseMoments.length, knowledge.moments.length);
});

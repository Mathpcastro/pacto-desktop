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

test("card count is validated, persisted and sent to the copy prompt", async (t) => {
  const store = await fixture(t);
  await assert.rejects(
    store.createProject({ title: "A", brief: "B", cardCount: 5 }),
    /cards inválida/,
  );
  const p = await store.createProject({ title: "A", brief: "B", cardCount: 4 });
  assert.equal(p.cardCount, 4);
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

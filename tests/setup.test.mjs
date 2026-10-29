import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../core/store.mjs";
import { Runtime } from "../core/runtime.mjs";
import { asUrl, setupPrompt, parseSetup, SECTIONS } from "../core/setup.mjs";

// Começo rápido do onboarding (link ou descrição) e o feedback que ensina a ferramenta.
const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH7sAAAAASUVORK5CYII=";
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "pacto-setup-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return new Store(root).init();
}
const knowledge = { method: "Método", lessons: [], prompts: [] };
const brandDoc = "# CONTEXTO OFICIAL DA MARCA\n\n## Negócio\nAgenda online para clínicas pequenas, com lembretes por WhatsApp. " + "Detalhe do público e da oferta. ".repeat(8);
const designDoc = "# DESIGN KIT OFICIAL\n\n## Paleta\nVerde-menta #3CC8A0, grafite #1E2328. " + "Regra de consistência entre cards. ".repeat(6);
const answer = `Claro! Aqui está:\n=== ${SECTIONS.name} ===\n**Agendei**\n=== ${SECTIONS.brand} ===\n${brandDoc}\n=== ${SECTIONS.design} ===\n${designDoc}\n`;

test("links are recognized with or without protocol; sentences are not links", () => {
  assert.equal(asUrl("https://agendei.app/oferta"), "https://agendei.app/oferta");
  assert.equal(asUrl("agendei.com.br/planos"), "https://agendei.com.br/planos");
  assert.equal(asUrl("agenda online para clínicas"), null);
  assert.equal(asUrl("ftp://x.com"), null);
  assert.equal(asUrl("localhost"), null);
  assert.equal(asUrl(""), null);
});

test("the copy-paste prompt is anchored on what the person sells and carries both official interviews", () => {
  const prompt = setupPrompt("agendei.app", { brandPrompt: "PERGUNTAS DA AULA 02", designPrompt: "PERGUNTAS DA AULA 05" });
  assert.match(prompt, /vender o produto deste link: https:\/\/agendei\.app\//);
  assert.match(prompt, /sobre ESSE produto, não sobre outro/);
  assert.match(prompt, /memória, projetos e conversas anteriores/);
  assert.match(prompt, /abra o link/);
  assert.match(prompt, /HIPÓTESE/);
  assert.match(prompt, /PERGUNTAS DA AULA 02[\s\S]*PERGUNTAS DA AULA 05/);
  for (const s of Object.values(SECTIONS)) assert.match(prompt, new RegExp(`=== ${s} ===`));
  const plain = setupPrompt("agenda online para clínicas, R$ 49/mês");
  assert.match(plain, /para vender isto: agenda online para clínicas, R\$ 49\/mês/);
  assert.doesNotMatch(plain, /abra o link/);
  assert.throws(() => setupPrompt("  "), /link ou uma frase/);
});

test("the pasted answer splits into name, context and Design Kit, even with headings and code fences inside", () => {
  const parsed = parseSetup("```markdown\n" + answer + "```");
  assert.equal(parsed.name, "Agendei");
  assert.ok(parsed.brand.startsWith("# CONTEXTO OFICIAL DA MARCA"));
  assert.ok(parsed.design.startsWith("# DESIGN KIT OFICIAL"));
  assert.doesNotMatch(parsed.brand, /DESIGN KIT OFICIAL/);
  assert.throws(() => parseSetup("só um texto qualquer sem as partes"), /Não encontrei as partes/);
  assert.throws(() => parseSetup(`=== ${SECTIONS.brand} ===\ncurto\n=== ${SECTIONS.design} ===\n${designDoc}`), /Contexto da Marca veio vazio/);
  assert.throws(() => parseSetup(`=== ${SECTIONS.brand} ===\n${brandDoc}\n=== ${SECTIONS.design} ===\ncurto`), /Design Kit veio vazio/);
});

test("importSetup saves both documents as interview drafts for review", async (t) => {
  const store = await fixture(t);
  const runtime = new Runtime({ store, knowledge, codex: { status: { account: { connected: false } }, run: async () => ({}) } });
  const { prompt } = await runtime.request("setupPrompt", { input: "agendei.app" });
  assert.match(prompt, /agendei\.app/);
  const state = await runtime.request("importSetup", { text: answer });
  assert.equal(state.onboarding.brand.brandName, "Agendei");
  assert.ok(state.onboarding.brand.document.includes("Agenda online"));
  assert.ok(state.onboarding.design.document.includes("#3CC8A0"));
  assert.equal(state.profile, null, "o perfil só é salvo quando a pessoa aprova na tela final");
});

test("quickSetup reads the page, sends its text and screenshot, and writes both drafts without questions", async (t) => {
  const store = await fixture(t);
  const calls = [];
  const replies = [{ reply: "Revise.", complete: true, brandName: "Agendei", document: brandDoc }, { reply: "Revise.", complete: true, brandName: "Agendei", document: designDoc }];
  const pages = [];
  const runtime = new Runtime({
    store,
    knowledge,
    codex: { status: { account: { connected: true } }, run: async (o) => { calls.push(o); return { text: JSON.stringify(replies.shift()) }; } },
    dialogs: { readPage: async (url) => { pages.push(url); return { url, title: "Agendei · agenda online", description: "Lembretes por WhatsApp", text: "Agenda online para clínicas. ".repeat(20), colors: ["#3cc8a0", "#1e2328"], screenshot: png }; } },
  });
  const state = await runtime.request("quickSetup", { input: "agendei.app" });
  assert.deepEqual(pages, ["https://agendei.app/"]);
  assert.equal(calls.length, 2);
  assert.match(calls[0].prompt, /MODO RÁPIDO DO APLICATIVO: não faça perguntas/);
  assert.match(calls[0].prompt, /O QUE O USUÁRIO VENDE[^\n]*agendei\.app/);
  assert.match(calls[0].prompt, /Texto da página:\nAgenda online para clínicas/);
  assert.match(calls[1].prompt, /Cores mais usadas no site: #3cc8a0, #1e2328/);
  assert.match(calls[1].prompt, /CONTEXTO OFICIAL DA MARCA JÁ MONTADO:\n# CONTEXTO OFICIAL DA MARCA/);
  assert.deepEqual(calls[1].references, [png]);
  assert.equal(state.onboarding.brand.document, brandDoc.trim());
  assert.equal(state.onboarding.design.document, designDoc.trim());
  assert.equal(state.onboarding.brand.brandName, "Agendei");
  assert.equal(state.interviewing, null);
});

test("quickSetup works from a sentence and refuses an empty page", async (t) => {
  const store = await fixture(t);
  const replies = [{ reply: "", complete: true, brandName: "Doce Ofício", document: brandDoc }, { reply: "", complete: true, brandName: "", document: designDoc }];
  let read = 0;
  const runtime = new Runtime({
    store,
    knowledge,
    codex: { status: { account: { connected: true } }, run: async () => ({ text: JSON.stringify(replies.shift()) }) },
    dialogs: { readPage: async () => { read++; return { title: "", description: "", text: "Entrar", colors: [] }; } },
  });
  const state = await runtime.request("quickSetup", { input: "bolos caseiros por encomenda em Curitiba" });
  assert.equal(read, 0);
  assert.equal(state.onboarding.brand.brandName, "Doce Ofício");
  await assert.rejects(runtime.request("quickSetup", { input: "app.exemplo.com/login" }), /quase não tem texto/);
});

test("stopping quickSetup frees the app at once, even while the page or the Codex is still busy", async (t) => {
  const store = await fixture(t);
  let releasePage;
  const page = new Promise((resolve) => { releasePage = resolve; });
  const replies = [{ reply: "", complete: true, brandName: "Agendei", document: brandDoc }, { reply: "", complete: true, brandName: "Agendei", document: designDoc }];
  let run = 0;
  const runtime = new Runtime({
    store,
    knowledge,
    codex: { status: { account: { connected: true } }, cancel: async () => {}, run: async () => { run++; return { text: JSON.stringify(replies.shift()) }; } },
    dialogs: { readPage: () => page },
  });
  const first = runtime.request("quickSetup", { input: "agendei.app" });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(runtime.state().interviewing, "quick");
  const stopped = await runtime.request("cancelInterview");
  assert.equal(stopped.interviewing, null, "a tela libera os botões sem esperar a página");
  // A segunda tentativa não esbarra em "Aguarde ou cancele a operação em andamento".
  const retry = await runtime.request("quickSetup", { input: "bolos caseiros por encomenda" });
  assert.equal(retry.onboarding.design.document, designDoc.trim());
  // A leitura antiga termina depois e não chama o Codex nem sobrescreve nada.
  releasePage({ title: "Outro", text: "Texto antigo. ".repeat(30), colors: [] });
  await first;
  assert.equal(run, 2);
  assert.equal(runtime.state().onboarding.brand.brandName, "Agendei");
});

test("stopping during the Design Kit step keeps the context and never saves a late Design Kit", async (t) => {
  const store = await fixture(t);
  let releaseDesign;
  const runtime = new Runtime({
    store,
    knowledge,
    codex: {
      status: { account: { connected: true } },
      cancel: async () => {},
      run: async (o) => (/Aula 05/.test(o.prompt) ? new Promise((resolve) => { releaseDesign = () => resolve({ text: JSON.stringify({ reply: "", complete: true, brandName: "", document: designDoc }) }); }) : { text: JSON.stringify({ reply: "", complete: true, brandName: "Doce Ofício", document: brandDoc }) }),
    },
  });
  const pending = runtime.request("quickSetup", { input: "bolos caseiros por encomenda em Curitiba" });
  while (!releaseDesign) await new Promise((resolve) => setImmediate(resolve));
  const stopped = await runtime.request("cancelInterview");
  assert.equal(stopped.interviewing, null);
  assert.equal(stopped.onboarding.brand.document, brandDoc.trim());
  releaseDesign();
  await pending;
  assert.equal(runtime.state().onboarding.design.document, "");
});

test("feedback is stored by area and reaches the copy and image prompts that match", async (t) => {
  const store = await fixture(t);
  const runtime = new Runtime({ store, knowledge, codex: { status: { account: { connected: false } }, run: async () => ({}) } });
  await runtime.request("addFeedback", { text: "Nunca use emoji", area: "texto" });
  await runtime.request("addFeedback", { text: "Capas com fundo escuro", area: "visual" });
  const state = await runtime.request("addFeedback", { text: "Sempre cite o teste grátis de 14 dias", area: "geral" });
  assert.equal(state.feedback.length, 3);
  await assert.rejects(runtime.request("addFeedback", { text: "x", area: "texto" }), /Escreva/);
  await assert.rejects(runtime.request("addFeedback", { text: "algo", area: "outra" }), /Área/);
  const brand = runtime.brandContext();
  assert.match(brand, /PREFERÊNCIAS DO USUÁRIO/);
  assert.match(brand, /Nunca use emoji/);
  assert.match(brand, /teste grátis/);
  assert.doesNotMatch(brand, /fundo escuro/);
  const p = await store.createProject({ title: "A", brief: "B" });
  const image = runtime.imageContext(p.id);
  assert.match(image, /Capas com fundo escuro/);
  assert.match(image, /teste grátis/);
  assert.doesNotMatch(image, /emoji/);
  const after = await runtime.request("removeFeedback", { id: state.feedback.find((f) => f.area === "texto").id });
  assert.equal(after.feedback.length, 2);
  assert.doesNotMatch(runtime.brandContext(), /emoji/);
});

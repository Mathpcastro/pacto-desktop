import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../core/store.mjs";
import { Profiles, MAIN_PROFILE } from "../core/profiles.mjs";
import { Runtime } from "../core/runtime.mjs";

// Perfis (multicontas): cada perfil é uma biblioteca separada; a CLI pode agir num perfil sem trocar a janela.
const knowledge = { method: "Método", lessons: [], prompts: [] };
const brandDoc = "# CONTEXTO OFICIAL DA MARCA\n\n" + "Detalhe do público e da oferta. ".repeat(10);
const designDoc = "# DESIGN KIT OFICIAL\n\n" + "Regra de consistência entre cards. ".repeat(8);
async function folder(t) {
  const root = await mkdtemp(join(tmpdir(), "pacto-profiles-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}
async function setup(t, codex = { status: { account: { connected: true } }, run: async () => ({}) }) {
  const root = await folder(t);
  const profiles = await new Profiles(root).init();
  const events = [];
  const runtime = new Runtime({ store: await profiles.store(), profiles, codex, knowledge, emit: (e) => events.push(e) });
  return { root, profiles, runtime, events };
}

test("the library from before profiles becomes the main profile without moving files", async (t) => {
  const root = await folder(t);
  const old = await new Store(root).init();
  const p = await old.createProject({ title: "Antigo", brief: "B" });
  const profiles = await new Profiles(root).init();
  assert.equal(profiles.active, MAIN_PROFILE);
  assert.deepEqual(profiles.list().map((x) => x.name), ["Principal"]);
  const store = await profiles.store();
  assert.equal(store.get(p.id).title, "Antigo");
  assert.equal(store.root, root, "o perfil principal continua na pasta de sempre");
  assert.equal(JSON.parse(await readFile(join(root, "profiles.json"), "utf8")).active, MAIN_PROFILE);
});

test("profiles are isolated and a request can target another profile without switching the window", async (t) => {
  const { runtime, events } = await setup(t);
  const created = await runtime.request("createProfile", { name: "Cliente Ana", activate: false });
  const ana = created.profile.id;
  assert.equal(created.profileId, MAIN_PROFILE);
  assert.deepEqual(created.profiles.map((p) => p.name), ["Principal", "Cliente Ana"]);
  const project = await runtime.request("createProject", { profileId: ana, title: "Da Ana", brief: "B" });
  events.length = 0;
  await runtime.request("saveProject", { profileId: ana, id: project.id, title: "Da Ana 2" });
  assert.ok(events.every((e) => e.profileId === ana), "eventos do trabalho na Ana saem marcados com o perfil dela");
  assert.equal((await runtime.request("bootstrap")).projects.length, 0, "o perfil ativo não vê o projeto da Ana");
  const inAna = await runtime.request("bootstrap", { profileId: ana });
  assert.equal(inAna.profileId, ana);
  assert.equal(inAna.projects[0].title, "Da Ana 2");
  assert.equal(runtime.state().profileId, MAIN_PROFILE);
});

test("work started in a profile keeps saving there after the request returns", async (t) => {
  const replies = [{ reply: "", complete: true, brandName: "Ana Doces", document: brandDoc }, { reply: "", complete: true, brandName: "", document: designDoc }];
  const { runtime } = await setup(t, { status: { account: { connected: true } }, run: async () => { await new Promise((r) => setTimeout(r, 5)); return { text: JSON.stringify(replies.shift()) }; } });
  const { profile } = await runtime.request("createProfile", { name: "Ana", activate: false });
  await runtime.request("quickSetup", { profileId: profile.id, input: "doces por encomenda" });
  assert.equal((await runtime.request("bootstrap", { profileId: profile.id })).onboarding.brand.brandName, "Ana Doces");
  assert.equal(runtime.state().onboarding.brand.document, "", "o Principal não recebe a marca da Ana");
});

test("switching announces the new profile, and is refused while something is running", async (t) => {
  const { runtime, events, profiles } = await setup(t);
  const state = await runtime.request("createProfile", { name: "Loja" });
  assert.notEqual(state.profileId, MAIN_PROFILE);
  assert.equal(profiles.active, state.profileId);
  assert.equal(state.profile, null, "perfil novo começa sem marca e abre o onboarding");
  assert.equal(events.at(-1).type, "profile");
  assert.equal(events.at(-1).state.profileId, state.profileId);
  runtime.job = { id: "x", kind: "plan", cancelled: false };
  await assert.rejects(runtime.request("switchProfile", { id: MAIN_PROFILE }), /antes de trocar de perfil/);
  await assert.rejects(runtime.request("createProfile", { name: "Outra" }), /Aguarde/);
  runtime.job = null;
  assert.equal((await runtime.request("switchProfile", { id: MAIN_PROFILE })).profileId, MAIN_PROFILE);
});

test("deleting removes the profile folder; the main profile cannot be deleted", async (t) => {
  const { runtime, profiles } = await setup(t);
  const { profileId } = await runtime.request("createProfile", { name: "Temporário" });
  await runtime.request("createProject", { title: "X", brief: "Y" });
  const dir = profiles.folder(profileId);
  await access(join(dir, "state.json"));
  const after = await runtime.request("deleteProfile", { id: profileId });
  assert.equal(after.profileId, MAIN_PROFILE);
  assert.deepEqual(after.profiles.map((p) => p.id), [MAIN_PROFILE]);
  await assert.rejects(access(dir));
  await assert.rejects(runtime.request("deleteProfile", { id: MAIN_PROFILE }), /não pode ser excluído/);
  await assert.rejects(runtime.request("bootstrap", { profileId: "nao-existe" }), /Perfil não encontrado/);
  await assert.rejects(runtime.request("createProfile", { name: "   " }), /Dê um nome/);
});

test("renaming keeps the id and survives a restart", async (t) => {
  const { runtime, root } = await setup(t);
  const { profile } = await runtime.request("createProfile", { name: "Ana", activate: false });
  await runtime.request("renameProfile", { id: profile.id, name: "Ana Clínica" });
  const reopened = await new Profiles(root).init();
  assert.equal(reopened.find(profile.id).name, "Ana Clínica");
});

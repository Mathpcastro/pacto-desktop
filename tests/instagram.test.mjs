import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Composio, friendly, pickId, toolData } from "../core/composio.mjs";
import { postable, nextMetricsAt } from "../core/instagram.mjs";
import { OsScheduler, parseWhen, windowsTaskXml, duePosts, LATE_LIMIT_MS } from "../core/schedule.mjs";
import { Profiles } from "../core/profiles.mjs";
import { Runtime } from "../core/runtime.mjs";

// Instagram pelo Composio: contas já conectadas no projeto (sem reconectar), padrão por perfil,
// postar e agendar em várias contas, publicar vencidos e métricas somadas.
const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH7sAAAAASUVORK5CYII=";
const KEY = "ak_teste_1234567890";
const HOUR = 60 * 60 * 1000;
// Contas que já existem no Composio da pessoa (conectadas por outros apps ou pelo painel).
const EXISTING = [
  { id: "ca_ana", user_id: "default", status: "ACTIVE", info: { id: "1001", user_id: "1001", username: "ana.doces", account_type: "BUSINESS", followers_count: 1520 } },
  { id: "ca_loja", user_id: "outro-app", status: "ACTIVE", info: { id: "1002", user_id: "1002", username: "loja.oficial", account_type: "MEDIA_CREATOR", followers_count: 300 } },
  { id: "ca_pessoal", user_id: "default", status: "ACTIVE", info: { id: "1003", user_id: "1003", username: "eu.pessoal", account_type: "PERSONAL" } },
  { id: "ca_velha", user_id: "default", status: "EXPIRED", info: {} },
];
const NEW = { id: "ca_nova", info: { id: "1004", user_id: "1004", username: "nova.conta", account_type: "BUSINESS", followers_count: 10 } };

// Composio falso: grava as chamadas e responde como a API REST v3.1.
function fakeFetch({ tools = {}, fail = {} } = {}) {
  const calls = [];
  const accounts = EXISTING.map((a) => ({ ...a }));
  const fetch = async (url, init = {}) => {
    const path = url.replace("https://backend.composio.dev/api/v3.1", "");
    const body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body;
    calls.push({ method: init.method, path, body, headers: init.headers });
    const json = (value, code = 200) => ({ ok: code < 400, status: code, text: async () => JSON.stringify(value) });
    if (url.startsWith("https://storage.composio.dev/")) return { ok: true, status: 200, text: async () => "" };
    if (init.headers?.["x-api-key"] !== KEY) return json({ error: { message: `Invalid API key: ${init.headers["x-api-key"].slice(0, 3)}**${init.headers["x-api-key"].slice(-4)}` } }, 401);
    if (path === "/tool_router/session") return json({ session_id: "trs_1" });
    if (path.endsWith("/link")) {
      accounts.push({ ...NEW, user_id: "carrossell-novo", status: "ACTIVE" });
      return json({ redirect_url: "https://connect.composio.dev/link/abc", connected_account_id: NEW.id });
    }
    if (path.startsWith("/connected_accounts?")) return json({ items: accounts.map(({ id, user_id, status }) => ({ id, user_id, status, toolkit: { slug: "instagram" } })), next_cursor: null });
    if (path.startsWith("/connected_accounts/")) return json(init.method === "DELETE" ? {} : { status: "ACTIVE" });
    if (path === "/files/upload/request") return json({ key: `projects/p/${body.filename}`, new_presigned_url: `https://storage.composio.dev/${body.filename}?sig=1`, metadata: { storage_backend: "s3" } });
    if (path.startsWith("/tools/execute/")) {
      const slug = path.slice("/tools/execute/".length);
      const account = accounts.find((a) => a.id === body.connected_account_id);
      if (fail[slug]?.[body.connected_account_id]) return json({ data: {}, error: fail[slug][body.connected_account_id], successful: false });
      const reply = slug === "INSTAGRAM_GET_USER_INFO" ? account.info : tools[slug];
      const value = typeof reply === "function" ? reply(body.arguments, body.connected_account_id) : reply;
      return json({ data: value ?? {}, error: null, successful: true });
    }
    return json({ error: { message: `rota inesperada ${path}` } }, 404);
  };
  const executed = () => calls.filter((c) => c.path.startsWith("/tools/execute/")).map((c) => [c.path.slice(15), c.body.connected_account_id, c.body.arguments]);
  return { fetch, calls, executed };
}
const TOOLS = {
  INSTAGRAM_GET_IG_USER_CONTENT_PUBLISHING_LIMIT: { data: [{ quota_usage: 2, config: { quota_total: 100 } }] },
  INSTAGRAM_CREATE_CAROUSEL_CONTAINER: (args) => ({ id: `container-${args.ig_user_id}` }),
  INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH: (args) => JSON.stringify({ id: `media-${args.ig_user_id}` }),
  INSTAGRAM_GET_IG_MEDIA: (args) => (args.fields.includes("saved_count") ? { id: args.ig_media_id, permalink: `https://www.instagram.com/p/${args.ig_media_id}/`, like_count: 40, comments_count: 12, saved_count: 30, shares_count: 5, view_count: 900 } : { id: args.ig_media_id, permalink: `https://www.instagram.com/p/${args.ig_media_id}/` }),
  INSTAGRAM_GET_IG_MEDIA_INSIGHTS: { data: [{ name: "reach", values: [{ value: 700 }] }, { name: "saved", values: [{ value: 31 }] }] },
};
function secrets(initial = "") {
  let key = initial;
  let accounts = [];
  return { installId: () => "inst1", hasKey: () => Boolean(key), getKey: () => key, setKey: async (k) => void (key = k), clearKey: async () => void ((key = ""), (accounts = [])), accounts: () => structuredClone(accounts), saveAccounts: async (list) => void (accounts = structuredClone(list)) };
}
function scheduler() {
  const tasks = new Map();
  return { tasks, add: async (id, at) => void tasks.set(id, at), remove: async (id) => void tasks.delete(id) };
}
async function setup(t, { tools = TOOLS, fail, key = "", clock = Date.parse("2026-11-02T12:00:00Z") } = {}) {
  const root = await mkdtemp(join(tmpdir(), "carrossell-ig-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const profiles = await new Profiles(root).init();
  const api = fakeFetch({ tools, fail });
  const opened = [];
  const sched = scheduler();
  const now = { value: clock };
  const runtime = new Runtime({
    store: await profiles.store(),
    profiles,
    codex: { status: { account: { connected: true } }, run: async () => ({}) },
    knowledge: { method: "M", lessons: [], prompts: [] },
    instagram: { composio: (o) => new Composio({ ...o, fetch: api.fetch }), now: () => now.value, pollMs: 5 },
    dialogs: { secrets: secrets(key), scheduler: sched, openAuth: async (url) => opened.push(url), toJpeg: async (pngs) => pngs.map((b, i) => Buffer.from(`jpeg-${i}`)) },
  });
  return { runtime, api, opened, sched, now, profiles };
}
// Com a chave salva, as contas que já estavam no Composio entram sem reconectar.
async function withKey(t, options) {
  const ctx = await setup(t, options);
  await ctx.runtime.request("saveComposioKey", { key: KEY });
  return ctx;
}
async function readyProject(runtime, cards = 3) {
  const p = await runtime.request("createProject", { title: "Carrossel", brief: "B" });
  const slides = Array.from({ length: cards }, (_, i) => ({ id: `s${i}`, title: `Card ${i + 1}`, body: "" }));
  await runtime.request("saveProject", { id: p.id, caption: "Legenda #teste", slides });
  for (const s of slides) await runtime.store.addImage(p.id, s.id, Buffer.from(png.split(",")[1], "base64"));
  return p.id;
}

test("Composio data comes in several shapes and errors become instructions", () => {
  assert.deepEqual(toolData('{"id":"1"}'), { id: "1" });
  assert.deepEqual(toolData({ data: { id: "2" }, successful: true }), { id: "2" });
  assert.equal(pickId('{"id":"18000000000000999"}'), "18000000000000999");
  assert.equal(pickId({ creation_id: "77" }, ["id", "creation_id"]), "77");
  assert.equal(friendly("Invalid API key", 401).code, "key");
  const forbidden = friendly("API key lacks permission: session management", 403);
  assert.equal(forbidden.code, "forbidden");
  assert.match(forbidden.message, /recusou o pedido \(403\): API key lacks permission: session management\. Se a sua chave/);
  assert.equal(friendly("The user is not a Business or Creator account").code, "account");
  assert.equal(friendly("Error validating access token: Session has expired").code, "reconnect");
  assert.equal(friendly("Application request limit reached (content publishing)").code, "quota");
});

test("saving the key brings every Instagram already connected in Composio, without reconnecting", async (t) => {
  const ctx = await setup(t);
  await assert.rejects(ctx.runtime.request("saveComposioKey", { key: "curta" }), /não parece uma chave/);
  await assert.rejects(ctx.runtime.request("saveComposioKey", { key: "ak_errada_123456" }), /não aceitou a chave \(ak_\*\*3456\)\. Use a chave do PROJETO: em composio\.dev, abra Settings › Project Settings › API Keys/);
  await assert.rejects(ctx.runtime.request("saveComposioKey", { key: "uak_minha_chave_123456" }), /chave de usuário \(começa com uak_\)/);
  await assert.rejects(ctx.runtime.request("saveComposioKey", { key: "ck_minha_chave_do_mcp" }), /chave do Composio Connect \(a do MCP, começa com ck_\)/);
  assert.equal(ctx.api.calls.filter((c) => /^(uak|ck)_/.test(c.headers?.["x-api-key"] || "")).length, 0, "chaves de usuário e do MCP nem são enviadas");
  const status = await ctx.runtime.request("saveComposioKey", { key: KEY });
  assert.deepEqual(status.accounts.map((a) => [a.username, a.status]), [["ana.doces", "ACTIVE"], ["loja.oficial", "ACTIVE"], ["eu.pessoal", "personal"]], "contas expiradas ficam de fora; a pessoal aparece explicando");
  assert.match(status.accounts[2].error, /contas Profissionais/);
  assert.deepEqual(ctx.opened, [], "nenhum navegador aberto: nada foi reconectado");
  const info = ctx.api.executed().filter(([slug]) => slug === "INSTAGRAM_GET_USER_INFO").map(([, id]) => id);
  assert.deepEqual(info, ["ca_ana", "ca_loja", "ca_pessoal"]);
  // Atualizar a lista não pergunta de novo o @ das contas já conhecidas.
  await ctx.runtime.request("syncInstagram");
  assert.equal(ctx.api.executed().filter(([slug, id]) => slug === "INSTAGRAM_GET_USER_INFO" && id !== "ca_pessoal").length, 2);
  const state = ctx.runtime.state();
  assert.ok(!JSON.stringify(state).includes(KEY), "a chave não aparece no estado");
  assert.equal(state.composio.hasKey, true);
  assert.equal(state.composio.accounts.length, 3);
});

test("each Carrossell profile chooses its default accounts", async (t) => {
  const ctx = await withKey(t);
  assert.deepEqual(ctx.runtime.state().composio.defaults, []);
  await assert.rejects(ctx.runtime.request("setInstagramDefaults", { accounts: ["ca_pessoal"] }), /não encontrada/);
  await ctx.runtime.request("setInstagramDefaults", { accounts: ["ca_ana", "ca_loja"] });
  const { createdProfile } = await ctx.runtime.request("createProfile", { name: "Loja", activate: false });
  await ctx.runtime.request("setInstagramDefaults", { profileId: createdProfile.id, accounts: ["ca_loja"] });
  assert.deepEqual(ctx.runtime.state().composio.defaults, ["ca_ana", "ca_loja"]);
  assert.deepEqual((await ctx.runtime.request("bootstrap", { profileId: createdProfile.id })).composio.defaults, ["ca_loja"]);
});

test("connecting a new account opens the Composio link and adds it to the list", async (t) => {
  const ctx = await withKey(t);
  const started = await ctx.runtime.request("connectInstagram");
  assert.deepEqual(ctx.opened, ["https://connect.composio.dev/link/abc"]);
  assert.equal(started.pending, true);
  const session = ctx.api.calls.find((c) => c.path === "/tool_router/session");
  assert.match(session.body.user_id, /^carrossell-inst1-[0-9a-f]{8}$/, "cada conta nova ganha um usuário próprio no Composio");
  const done = await ctx.runtime.request("checkInstagram");
  assert.equal(done.pending, false);
  assert.ok(done.accounts.some((a) => a.username === "nova.conta"));
  assert.deepEqual(done.defaults, ["ca_nova"], "sem padrão ainda, a conta nova vira o padrão do perfil");
});

test("posting to two accounts uploads JPEGs and publishes on each one", async (t) => {
  const ctx = await withKey(t);
  const id = await readyProject(ctx.runtime, 3);
  await assert.rejects(ctx.runtime.request("publishInstagram", { id }), /Escolha pelo menos uma conta/);
  const p = await ctx.runtime.request("publishInstagram", { id, accounts: ["ca_ana", "ca_loja"] });
  assert.deepEqual(p.instagram.posts.map((x) => [x.username, x.mediaId]), [["ana.doces", "media-1001"], ["loja.oficial", "media-1002"]]);
  assert.ok(p.publishedAt);
  const uploads = ctx.api.calls.filter((c) => c.path === "/files/upload/request").map((c) => [c.body.filename, c.body.mimetype]);
  assert.equal(uploads.length, 6);
  assert.deepEqual(uploads[0], ["01.jpg", "image/jpeg"]);
  const create = ctx.api.executed().filter(([slug]) => slug === "INSTAGRAM_CREATE_CAROUSEL_CONTAINER");
  assert.deepEqual(create.map(([, account, args]) => [account, args.ig_user_id]), [["ca_ana", "1001"], ["ca_loja", "1002"]]);
  assert.equal(create[0][2].caption, "Legenda #teste");
  assert.deepEqual(create[0][2].child_image_files[0], { name: "01.jpg", mimetype: "image/jpeg", s3key: "projects/p/01.jpg" });
  const userIds = ctx.api.calls.filter((c) => c.path === "/tools/execute/INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH").map((c) => c.body.user_id);
  assert.deepEqual(userIds, ["default", "outro-app"], "cada conta roda com o usuário que a conectou");
  await assert.rejects(ctx.runtime.request("publishInstagram", { id, accounts: ["ca_ana"] }), /já foi postado em @ana.doces/);
});

test("if one account fails, the others still post and the message says where it went", async (t) => {
  const ctx = await withKey(t, { fail: { INSTAGRAM_CREATE_CAROUSEL_CONTAINER: { ca_loja: "Error validating access token: Session has expired" } } });
  const id = await readyProject(ctx.runtime, 2);
  await assert.rejects(ctx.runtime.request("publishInstagram", { id, accounts: ["ca_ana", "ca_loja"] }), /Postado em @ana.doces\. Não saiu em @loja.oficial: A conexão com o Instagram expirou/);
  assert.deepEqual(ctx.runtime.store.get(id).instagram.posts.map((x) => x.username), ["ana.doces"]);
});

test("Instagram rules are checked before anything is sent", async (t) => {
  const ctx = await withKey(t);
  await ctx.runtime.request("setInstagramDefaults", { accounts: ["ca_ana"] });
  const many = await readyProject(ctx.runtime, 11);
  await assert.rejects(ctx.runtime.request("publishInstagram", { id: many }), /até 10 cards/);
  const id = await readyProject(ctx.runtime, 2);
  await ctx.runtime.request("saveProject", { id, slides: [{ id: "s0", title: "Mudou", body: "" }, { id: "s1", title: "Card 2", body: "" }] });
  await assert.rejects(ctx.runtime.request("publishInstagram", { id }), /Gere ou atualize/);
  assert.throws(() => postable({ format: "carrossel", slides: [{ image: png }, { image: png }], caption: "x".repeat(2201) }), /2200/);
  assert.equal(ctx.api.calls.filter((c) => c.path === "/files/upload/request").length, 0);
});

test("scheduling keeps the chosen accounts; due posts publish and late ones wait for confirmation", async (t) => {
  const ctx = await withKey(t);
  await ctx.runtime.request("setInstagramDefaults", { accounts: ["ca_ana"] });
  const id = await readyProject(ctx.runtime, 2);
  await assert.rejects(ctx.runtime.request("schedulePost", { id, at: "2026-11-02T12:00:30Z" }), /2 minutos/);
  const at = new Date(ctx.now.value + 2 * HOUR);
  const p = await ctx.runtime.request("schedulePost", { id, at: at.toISOString(), accounts: ["ca_ana", "ca_loja"] });
  assert.deepEqual([p.schedule.status, p.schedule.usernames], ["scheduled", ["ana.doces", "loja.oficial"]]);
  assert.equal(ctx.sched.tasks.get(id).getTime(), at.getTime());
  assert.deepEqual((await ctx.runtime.request("publishDue")).published, [], "antes da hora nada sai");
  ctx.now.value = at.getTime() + 60000;
  assert.deepEqual((await ctx.runtime.request("publishDue")).published, [id]);
  assert.equal(ctx.sched.tasks.has(id), false, "a tarefa do sistema é removida depois de postar");
  const after = ctx.runtime.store.get(id);
  assert.equal(after.schedule.status, "published");
  assert.equal(after.instagram.posts.length, 2);
  // Computador desligado por mais de 6 horas: não posta sozinho (vai nas contas padrão: só a Ana).
  const late = await readyProject(ctx.runtime, 2);
  await ctx.runtime.request("schedulePost", { id: late, at: new Date(ctx.now.value + 10 * 60000).toISOString() });
  ctx.now.value += 10 * 60000 + LATE_LIMIT_MS + 60000;
  assert.deepEqual((await ctx.runtime.request("publishDue")).late, [late]);
  assert.equal(ctx.runtime.store.get(late).schedule.status, "late");
  await ctx.runtime.request("publishInstagram", { id: late, accounts: ctx.runtime.store.get(late).schedule.accounts });
  assert.equal(ctx.runtime.store.get(late).schedule.status, "published");
});

test("scheduled posts in every profile are published by the system task", async (t) => {
  const ctx = await withKey(t);
  const { createdProfile } = await ctx.runtime.request("createProfile", { name: "Loja", activate: false });
  await ctx.runtime.inProfile(createdProfile.id, async () => {
    const id = await readyProject(ctx.runtime, 2);
    await ctx.runtime.request("schedulePost", { id, at: new Date(ctx.now.value + 5 * 60000).toISOString(), accounts: ["ca_loja"] });
  });
  ctx.now.value += 6 * 60000;
  const due = await ctx.runtime.request("publishDue");
  assert.equal(due.published.length, 1, "o post do perfil Loja saiu mesmo com o Principal ativo");
});

test("metrics of every account add up in the results used by the Rhythm and the Replicator", async (t) => {
  const ctx = await withKey(t);
  const id = await readyProject(ctx.runtime, 2);
  const posted = await ctx.runtime.request("publishInstagram", { id, accounts: ["ca_ana", "ca_loja"] });
  assert.equal(posted.instagram.posts[0].nextMetricsAt, new Date(ctx.now.value + 24 * HOUR).toISOString());
  assert.deepEqual(await ctx.runtime.request("refreshMetrics"), [], "antes de 1 dia não atualiza sozinho");
  ctx.now.value += 25 * HOUR;
  const updated = await ctx.runtime.request("refreshMetrics");
  assert.equal(updated.length, 2);
  assert.deepEqual(updated[0].metrics, { likes: 40, comments: 12, saves: 31, shares: 5, views: 900, reach: 700, interactions: null });
  const p = ctx.runtime.store.get(id);
  assert.deepEqual({ comments: p.results.comments, saves: p.results.saves, source: p.results.source }, { comments: 24, saves: 62, source: "instagram" });
  assert.equal(p.instagram.posts[0].nextMetricsAt, new Date(Date.parse(posted.instagram.posts[0].publishedAt) + 72 * HOUR).toISOString());
  assert.equal(nextMetricsAt(posted.instagram.posts[0].publishedAt, Date.parse(posted.instagram.posts[0].publishedAt) + 8 * 24 * HOUR), "");
});

test("small accounts still get likes and comments when insights are unavailable", async (t) => {
  const ctx = await withKey(t, { tools: { ...TOOLS, INSTAGRAM_GET_IG_MEDIA_INSIGHTS: () => ({ error: "(#10) Not enough followers to view insights" }) } });
  const id = await readyProject(ctx.runtime, 2);
  await ctx.runtime.request("publishInstagram", { id, accounts: ["ca_loja"] });
  const [m] = await ctx.runtime.request("refreshMetrics", { id });
  assert.equal(m.insights, "unavailable");
  assert.equal(m.metrics.comments, 12);
});

test("dates, the Windows task and the Mac agent", async () => {
  const now = new Date(2026, 10, 2, 12, 0);
  assert.equal(parseWhen("2026-11-02 18:30", now).getHours(), 18);
  assert.throws(() => parseWhen("amanhã", now), /Data inválida/);
  assert.throws(() => parseWhen("2027-06-01 10:00", now), /120 dias/);
  const xml = windowsTaskXml({ at: new Date(2026, 10, 2, 18, 30), exe: "C:\\Program Files\\Carrossell\\Carrossell.exe", args: ["--segundo-plano", "--publicar-agendados"] });
  assert.match(xml, /<StartBoundary>2026-11-02T18:30:00<\/StartBoundary>/);
  assert.match(xml, /<StartWhenAvailable>true<\/StartWhenAvailable>/);
  assert.match(xml, /<Command>C:\\Program Files\\Carrossell\\Carrossell.exe<\/Command>/);
  assert.match(xml, /<RunLevel>LeastPrivilege<\/RunLevel>/);
  const runs = [];
  const files = new Map();
  const win = new OsScheduler({ platform: "win32", exe: "C:\\C.exe", args: ["--segundo-plano"], run: async (c, a) => void runs.push([c, ...a]), writeFile: async (f, d) => void files.set(f, d), rm: async (f) => void files.delete(f), tempDir: "C:\\Temp" });
  await win.add("p1", new Date(2026, 10, 2, 18, 30));
  const create = runs.find((r) => r[1] === "/Create");
  assert.deepEqual(create.slice(0, 4), ["schtasks.exe", "/Create", "/TN", "Carrossell\\post-p1"]);
  assert.equal(files.size, 0, "o XML temporário é apagado");
  const mac = new OsScheduler({ platform: "darwin", exe: "/Applications/Carrossell.app/Contents/MacOS/Carrossell", args: ["--segundo-plano"], run: async (c, a) => void runs.push([c, ...a]), writeFile: async (f, d) => void files.set(f, String(d)), rm: async (f) => void files.delete(f), agentsDir: "/Users/a/Library/LaunchAgents", uid: 501 });
  await mac.add("p2", new Date(2026, 10, 2, 18, 30));
  const plist = [...files.values()].at(-1);
  assert.match(plist, /<string>--publicar-agendados<\/string>/);
  assert.match(plist, /<key>Hour<\/key><integer>18<\/integer>/);
  assert.deepEqual(runs.at(-1), ["launchctl", "bootstrap", "gui/501", "/Users/a/Library/LaunchAgents/com.carrossell.post.p2.plist"]);
  assert.deepEqual(duePosts([{ id: "a", schedule: { status: "scheduled", at: "2026-11-02T10:00:00Z" } }, { id: "b", schedule: { status: "published", at: "2026-11-02T10:00:00Z" } }], Date.parse("2026-11-02T11:00:00Z")), [{ id: "a", at: "2026-11-02T10:00:00Z", late: false }]);
});

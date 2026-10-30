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

// Instagram pelo Composio: chave, conexão por perfil, postar, agendar, publicar vencidos e métricas.
const png = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aH7sAAAAASUVORK5CYII=";
const KEY = "ak_teste_1234567890";
const HOUR = 60 * 60 * 1000;

// Composio falso: grava as chamadas e responde como a API REST v3.1.
function fakeFetch({ status = {}, tools = {} } = {}) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    const path = url.replace("https://backend.composio.dev/api/v3.1", "");
    const body = init.body && typeof init.body === "string" ? JSON.parse(init.body) : init.body;
    calls.push({ method: init.method, path, body, headers: init.headers });
    const json = (value, code = 200) => ({ ok: code < 400, status: code, text: async () => JSON.stringify(value) });
    if (init.headers?.["x-api-key"] !== KEY && !url.startsWith("https://storage")) return json({ error: { message: "Invalid API key" } }, 401);
    if (path === "/tool_router/session") return json({ session_id: `trs_${calls.length}` });
    if (path.endsWith("/link")) return json({ redirect_url: "https://connect.composio.dev/link/abc", connected_account_id: "ca_ana" });
    if (path.startsWith("/connected_accounts/")) return json(init.method === "DELETE" ? {} : { status: status.account || "ACTIVE" });
    if (path === "/files/upload/request") return json({ key: `projects/p/${body.filename}`, new_presigned_url: `https://storage.composio.dev/${body.filename}?sig=1`, metadata: { storage_backend: "s3" } });
    if (url.startsWith("https://storage.composio.dev/")) return { ok: true, status: 200, text: async () => "" };
    if (path.endsWith("/execute")) {
      const reply = tools[body.tool_slug];
      const value = typeof reply === "function" ? reply(body.arguments) : reply;
      if (value instanceof Error) return json({ result_type: "failed", data: {}, error: value.message, log_id: "l" });
      return json({ result_type: "completed", data: value ?? {}, error: null, log_id: "l" });
    }
    return json({ error: { message: `rota inesperada ${path}` } }, 404);
  };
  return { fetch, calls, executed: () => calls.filter((c) => c.path.endsWith("/execute")).map((c) => [c.body.tool_slug, c.body.arguments]) };
}
const TOOLS = {
  INSTAGRAM_GET_USER_INFO: { id: "17841400000000001", user_id: "17841400000000001", username: "ana.doces", account_type: "MEDIA_CREATOR", followers_count: 1520 },
  INSTAGRAM_GET_IG_USER_CONTENT_PUBLISHING_LIMIT: { data: [{ quota_usage: 2, config: { quota_total: 100 } }] },
  INSTAGRAM_CREATE_CAROUSEL_CONTAINER: { id: "18000000000000001" },
  INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH: JSON.stringify({ id: "18000000000000999" }),
  INSTAGRAM_GET_IG_MEDIA: (args) => (args.fields.includes("saved_count") ? { id: args.ig_media_id, permalink: "https://www.instagram.com/p/ABC/", like_count: 40, comments_count: 12, saved_count: 30, shares_count: 5, view_count: 900 } : { id: args.ig_media_id, permalink: "https://www.instagram.com/p/ABC/" }),
  INSTAGRAM_GET_IG_MEDIA_INSIGHTS: { data: [{ name: "reach", values: [{ value: 700 }] }, { name: "saved", values: [{ value: 31 }] }] },
};
function secrets(initial = "") {
  let key = initial;
  return { installId: () => "inst1", hasKey: () => Boolean(key), getKey: () => key, setKey: async (k) => void (key = k), clearKey: async () => void (key = "") };
}
function scheduler() {
  const tasks = new Map();
  return { tasks, add: async (id, at) => void tasks.set(id, at), remove: async (id) => void tasks.delete(id) };
}
async function setup(t, { tools = TOOLS, key = KEY, clock = Date.parse("2026-11-02T12:00:00Z") } = {}) {
  const root = await mkdtemp(join(tmpdir(), "carrossell-ig-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const profiles = await new Profiles(root).init();
  const api = fakeFetch({ tools });
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
async function readyProject(runtime, cards = 3) {
  const p = await runtime.request("createProject", { title: "Carrossel", brief: "B" });
  const slides = Array.from({ length: cards }, (_, i) => ({ id: `s${i}`, title: `Card ${i + 1}`, body: "" }));
  await runtime.request("saveProject", { id: p.id, caption: "Legenda #teste", slides });
  for (const s of slides) await runtime.store.addImage(p.id, s.id, Buffer.from(png.split(",")[1], "base64"));
  return p.id;
}
async function connected(ctx) {
  await ctx.runtime.request("connectInstagram");
  return ctx.runtime.request("checkInstagram");
}

test("Composio data comes in several shapes and errors become instructions", () => {
  assert.deepEqual(toolData('{"id":"1"}'), { id: "1" });
  assert.deepEqual(toolData({ data: { id: "2" }, successful: true }), { id: "2" });
  assert.equal(pickId('{"id":"18000000000000999"}'), "18000000000000999");
  assert.equal(pickId({ creation_id: "77" }, ["id", "creation_id"]), "77");
  assert.equal(friendly("Invalid API key", 401).code, "key");
  assert.equal(friendly("The user is not a Business or Creator account").code, "account");
  assert.equal(friendly("Error validating access token: Session has expired").code, "reconnect");
  assert.equal(friendly("Application request limit reached (content publishing)").code, "quota");
});

test("the key is tested before it is saved and never reaches the window state", async (t) => {
  const ctx = await setup(t, { key: "" });
  await assert.rejects(ctx.runtime.request("saveComposioKey", { key: "curta" }), /não parece uma chave/);
  await assert.rejects(ctx.runtime.request("saveComposioKey", { key: "ak_errada_123456" }), /chave do Composio não foi aceita/);
  const status = await ctx.runtime.request("saveComposioKey", { key: KEY });
  assert.equal(status.hasKey, true);
  assert.ok(!JSON.stringify(ctx.runtime.state()).includes(KEY), "a chave não aparece no estado");
  assert.equal(ctx.runtime.state().composio.hasKey, true);
});

test("connecting opens the Composio link and saves the account on this profile only", async (t) => {
  const ctx = await setup(t);
  const started = await ctx.runtime.request("connectInstagram");
  assert.deepEqual(ctx.opened, ["https://connect.composio.dev/link/abc"]);
  assert.equal(started.pending, true);
  const done = await ctx.runtime.request("checkInstagram");
  assert.deepEqual({ username: done.account.username, igUserId: done.account.igUserId, pending: done.pending }, { username: "ana.doces", igUserId: "17841400000000001", pending: false });
  const session = ctx.api.calls.find((c) => c.path === "/tool_router/session");
  assert.match(session.body.user_id, /^carrossell-inst1-principal$/);
  const other = await ctx.runtime.request("createProfile", { name: "Loja", activate: false });
  assert.equal((await ctx.runtime.request("instagramStatus", { profileId: other.createdProfile.id })).account, null);
});

test("posting uploads JPEGs to Composio, creates the carousel and publishes it", async (t) => {
  const ctx = await setup(t);
  await connected(ctx);
  const id = await readyProject(ctx.runtime, 3);
  const p = await ctx.runtime.request("publishInstagram", { id });
  assert.equal(p.instagram.mediaId, "18000000000000999");
  assert.equal(p.instagram.permalink, "https://www.instagram.com/p/ABC/");
  assert.ok(p.publishedAt);
  const uploads = ctx.api.calls.filter((c) => c.path === "/files/upload/request").map((c) => [c.body.filename, c.body.mimetype, c.body.toolkit_slug]);
  assert.deepEqual(uploads, [["01.jpg", "image/jpeg", "instagram"], ["02.jpg", "image/jpeg", "instagram"], ["03.jpg", "image/jpeg", "instagram"]]);
  assert.equal(ctx.api.calls.filter((c) => c.method === "PUT").length, 3);
  const order = ctx.api.executed().map(([slug]) => slug);
  assert.deepEqual(order.slice(-4), ["INSTAGRAM_GET_IG_USER_CONTENT_PUBLISHING_LIMIT", "INSTAGRAM_CREATE_CAROUSEL_CONTAINER", "INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH", "INSTAGRAM_GET_IG_MEDIA"]);
  const create = ctx.api.executed().find(([slug]) => slug === "INSTAGRAM_CREATE_CAROUSEL_CONTAINER")[1];
  assert.equal(create.caption, "Legenda #teste");
  assert.deepEqual(create.child_image_files[0], { name: "01.jpg", mimetype: "image/jpeg", s3key: "projects/p/01.jpg" });
  await assert.rejects(ctx.runtime.request("publishInstagram", { id }), /já foi postado/);
});

test("Instagram rules are checked before anything is sent", async (t) => {
  const ctx = await setup(t);
  await connected(ctx);
  const many = await readyProject(ctx.runtime, 11);
  await assert.rejects(ctx.runtime.request("publishInstagram", { id: many }), /até 10 cards/);
  const id = await readyProject(ctx.runtime, 2);
  await ctx.runtime.request("saveProject", { id, slides: [{ id: "s0", title: "Mudou", body: "" }, { id: "s1", title: "Card 2", body: "" }] });
  await assert.rejects(ctx.runtime.request("publishInstagram", { id }), /Gere ou atualize/);
  assert.throws(() => postable({ format: "carrossel", slides: [{ image: png }, { image: png }], caption: "x".repeat(2201) }), /2200/);
  assert.equal(ctx.api.calls.filter((c) => c.path === "/files/upload/request").length, 0);
});

test("a personal account or an expired connection gives a clear message", async (t) => {
  const ctx = await setup(t, { tools: { ...TOOLS, INSTAGRAM_CREATE_CAROUSEL_CONTAINER: new Error("Error validating access token: Session has expired") } });
  await connected(ctx);
  const id = await readyProject(ctx.runtime, 2);
  await assert.rejects(ctx.runtime.request("publishInstagram", { id }), /Reconecte em Marca › Instagram/);
  const personal = await setup(t, { tools: { ...TOOLS, INSTAGRAM_GET_USER_INFO: { id: "1", user_id: "1", username: "eu", account_type: "PERSONAL" } } });
  await personal.runtime.request("connectInstagram");
  await assert.rejects(personal.runtime.request("checkInstagram"), /contas Profissionais/);
});

test("scheduling registers the OS task; due posts publish and late ones wait for confirmation", async (t) => {
  const ctx = await setup(t);
  await connected(ctx);
  const id = await readyProject(ctx.runtime, 2);
  await assert.rejects(ctx.runtime.request("schedulePost", { id, at: "2026-11-02T12:00:30Z" }), /2 minutos/);
  const at = new Date(ctx.now.value + 2 * HOUR);
  const p = await ctx.runtime.request("schedulePost", { id, at: at.toISOString() });
  assert.equal(p.schedule.status, "scheduled");
  assert.equal(ctx.sched.tasks.get(id).getTime(), at.getTime());
  assert.deepEqual((await ctx.runtime.request("publishDue")).published, [], "antes da hora nada sai");
  ctx.now.value = at.getTime() + 60000;
  const due = await ctx.runtime.request("publishDue");
  assert.deepEqual(due.published, [id]);
  assert.equal(ctx.sched.tasks.has(id), false, "a tarefa do sistema é removida depois de postar");
  const after = ctx.runtime.store.get(id);
  assert.equal(after.schedule.status, "published");
  assert.ok(after.instagram.mediaId);
  // Computador desligado por mais de 6 horas: não posta sozinho.
  const late = await readyProject(ctx.runtime, 2);
  await ctx.runtime.request("schedulePost", { id: late, at: new Date(ctx.now.value + 10 * 60000).toISOString() });
  ctx.now.value += 10 * 60000 + LATE_LIMIT_MS + 60000;
  assert.deepEqual((await ctx.runtime.request("publishDue")).late, [late]);
  assert.equal(ctx.runtime.store.get(late).schedule.status, "late");
  assert.deepEqual((await ctx.runtime.request("publishDue", { includeLate: false })).published, []);
  await ctx.runtime.request("publishInstagram", { id: late });
  assert.equal(ctx.runtime.store.get(late).schedule.status, "published");
});

test("scheduled posts in every profile are published by the system task", async (t) => {
  const ctx = await setup(t);
  await connected(ctx);
  const { createdProfile } = await ctx.runtime.request("createProfile", { name: "Loja", activate: false });
  await ctx.runtime.inProfile(createdProfile.id, async () => {
    await connected(ctx);
    const id = await readyProject(ctx.runtime, 2);
    await ctx.runtime.request("schedulePost", { id, at: new Date(ctx.now.value + 5 * 60000).toISOString() });
  });
  ctx.now.value += 6 * 60000;
  const due = await ctx.runtime.request("publishDue");
  assert.equal(due.published.length, 1, "o post do perfil Loja saiu mesmo com o Principal ativo");
});

test("metrics fill the results used by the Rhythm and the Replicator", async (t) => {
  const ctx = await setup(t);
  await connected(ctx);
  const id = await readyProject(ctx.runtime, 2);
  const posted = await ctx.runtime.request("publishInstagram", { id });
  assert.equal(posted.instagram.nextMetricsAt, new Date(ctx.now.value + 24 * HOUR).toISOString());
  assert.deepEqual(await ctx.runtime.request("refreshMetrics"), [], "antes de 1 dia não atualiza sozinho");
  ctx.now.value += 25 * HOUR;
  const [m] = await ctx.runtime.request("refreshMetrics");
  assert.deepEqual(m.metrics, { likes: 40, comments: 12, saves: 31, shares: 5, views: 900, reach: 700, interactions: null });
  const p = ctx.runtime.store.get(id);
  assert.deepEqual({ comments: p.results.comments, saves: p.results.saves, source: p.results.source }, { comments: 12, saves: 31, source: "instagram" });
  assert.equal(p.instagram.nextMetricsAt, new Date(Date.parse(posted.instagram.publishedAt) + 72 * HOUR).toISOString());
  assert.equal(nextMetricsAt(posted.instagram.publishedAt, Date.parse(posted.instagram.publishedAt) + 8 * 24 * HOUR), "");
});

test("small accounts still get likes and comments when insights are unavailable", async (t) => {
  const ctx = await setup(t, { tools: { ...TOOLS, INSTAGRAM_GET_IG_MEDIA_INSIGHTS: new Error("(#10) Not enough followers to view insights") } });
  await connected(ctx);
  const id = await readyProject(ctx.runtime, 2);
  await ctx.runtime.request("publishInstagram", { id });
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

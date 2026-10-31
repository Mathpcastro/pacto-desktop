import { createServer as httpServer } from "node:http";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Recorder, NICHES, cardHtml, emptyOnboarding, nicheProfile, nicheProject } from "./lib.mjs";
import { Profiles } from "../../core/profiles.mjs";

// Aula 10 — Postar e agendar no Instagram (Carrossell 0.6), com o Agendei e a Doce Ofício.
// O Composio é FALSO e local (PACTO_COMPOSIO_URL, só em desenvolvimento): a gravação mostra o
// fluxo real do app, mas nada é publicado. As contas e os números são de exemplo.
const KEY = "ak_exemplo_da_aula_10";
const DAY = 864e5, now = Date.now();
const ACCOUNTS = [
  { id: "ca_agendei", igUserId: "2001", username: "agendei.app", followers: 2340 },
  { id: "ca_clinicas", igUserId: "2002", username: "agendei.clinicas", followers: 860 },
  { id: "ca_doce", igUserId: "2003", username: "doce.oficio", followers: 4120 },
];
const CAPTIONS = ["6 dados que todo agendamento precisa ter", "Confirmação automática: menos faltas na agenda", "O lembrete que a sua cliente não ignora", "Como encaixar um horário sem bagunçar o dia", "3 sinais de que a sua agenda está perdendo dinheiro"];
const posts = CAPTIONS.map((caption, i) => ({ id: `m${i}`, caption, media_type: "CAROUSEL_ALBUM", timestamp: new Date(now - (i + 1) * 1.3 * DAY).toISOString(), permalink: `https://www.instagram.com/p/exemplo${i}/`, like_count: [312, 248, 190, 151, 96][i], comments_count: [41, 33, 18, 12, 7][i], saves: [287, 201, 164, 88, 40][i], shares: [64, 52, 31, 19, 8][i], reach: [9800, 7600, 5400, 3900, 2100][i] }));
const fake = httpServer(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks);
  const send = (value, code = 200) => (res.writeHead(code, { "content-type": "application/json" }), res.end(JSON.stringify(value)));
  if (req.method === "PUT") return res.end();
  if (req.headers["x-api-key"] !== KEY) return send({ error: { message: "Invalid API key: ak_**exem" } }, 401);
  const body = raw.length ? JSON.parse(raw) : {};
  const path = req.url.replace("/api/v3.1", "");
  if (path === "/tool_router/session") return send({ session_id: "trs_aula" });
  if (path.endsWith("/link")) return send({ redirect_url: "https://connect.composio.dev/link/aula", connected_account_id: "ca_agendei" });
  if (path.startsWith("/connected_accounts?")) return send({ items: ACCOUNTS.map((a) => ({ id: a.id, user_id: "aula", status: "ACTIVE", toolkit: { slug: "instagram" } })), next_cursor: null });
  if (path.startsWith("/connected_accounts/")) return send({ status: "ACTIVE" });
  if (path === "/files/upload/request") return send({ key: `aula/${body.filename}`, new_presigned_url: `http://127.0.0.1:${fake.address().port}/storage/${body.filename}`, metadata: { storage_backend: "s3" } });
  const slug = path.split("/tools/execute/")[1];
  if (!slug) return send({ error: { message: `rota ${path}` } }, 404);
  const a = ACCOUNTS.find((x) => x.id === body.connected_account_id), args = body.arguments || {};
  await new Promise((r) => setTimeout(r, 450)); // tempo de rede, para o progresso aparecer na tela
  let data = {};
  if (slug === "INSTAGRAM_GET_USER_INFO") data = { id: a.igUserId, user_id: a.igUserId, username: a.username, account_type: "BUSINESS", followers_count: a.followers };
  if (slug === "INSTAGRAM_GET_IG_USER_CONTENT_PUBLISHING_LIMIT") data = { data: [{ quota_usage: 1, config: { quota_total: 100 } }] };
  if (slug === "INSTAGRAM_CREATE_CAROUSEL_CONTAINER") data = { id: `container-${a.igUserId}` };
  if (slug === "INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH") data = { id: `1800${a.igUserId}` };
  if (slug === "INSTAGRAM_GET_IG_MEDIA") data = { id: args.ig_media_id, permalink: "https://www.instagram.com/p/exemplo/", like_count: a.id === "ca_agendei" ? 186 : 64, comments_count: a.id === "ca_agendei" ? 27 : 9, saved_count: a.id === "ca_agendei" ? 143 : 38, shares_count: a.id === "ca_agendei" ? 31 : 6, view_count: a.id === "ca_agendei" ? 5200 : 1700 };
  if (slug === "INSTAGRAM_GET_IG_MEDIA_INSIGHTS") {
    const p = posts.find((x) => x.id === args.ig_media_id);
    data = { data: p ? [["saved", p.saves], ["shares", p.shares], ["reach", p.reach]].map(([name, value]) => ({ name, values: [{ value }] })) : [{ name: "reach", values: [{ value: a.id === "ca_agendei" ? 4300 : 1250 }] }] };
  }
  if (slug === "INSTAGRAM_GET_USER_INSIGHTS") {
    const days = Math.round((now / 1000 - args.since) / 86400) > 10 ? 30 : 7;
    data = { data: [{ name: args.metric[0], total_value: { value: { reach: days === 30 ? 61200 : 18400, profile_views: 1320, accounts_engaged: 2240 }[args.metric[0]] } }] };
  }
  if (slug === "INSTAGRAM_GET_IG_USER_MEDIA") data = { data: posts.map(({ saves, shares, reach, ...p }) => p), paging: {} };
  send({ data, successful: true });
});
await new Promise((r) => fake.listen(0, "127.0.0.1", r));
process.env.PACTO_CLI_PREVIEW = "instalado";
process.env.PACTO_COMPOSIO_URL = `http://127.0.0.1:${fake.address().port}`;

const ago = (d) => new Date(now - d * DAY).toISOString();
const post = await nicheProject("saas", { caption: "6 dados que todo agendamento precisa ter. Salve para conferir na próxima configuração da sua agenda." });
const later = { ...(await nicheProject("saas")), id: "p-saas-agendar", title: "Confirmação automática: menos faltas", createdAt: ago(1), updatedAt: ago(1) };
const state = {
  profile: await nicheProfile("saas", "Agendei"),
  onboarding: emptyOnboarding(),
  ideas: [JSON.parse(await readFile(join(NICHES, "saas", "radar.json"), "utf8"))],
  projects: [post, later],
  media: { displayName: "Agendei", handle: "agendei.app", verified: true, avatar: "", faces: [], scenes: [], assets: [] },
  settings: { weeklyGoal: 5, driveFolder: "", firstCompletedAt: ago(12), lastReminderAt: ago(0) },
};
const rec = await new Recorder("aula-10").init();
try {
  const userData = await rec.userData({ auth: true, state });
  // Perfis: o principal vira "Agendei", com histórico de seguidores; a Doce Ofício é o segundo perfil.
  const profiles = await new Profiles(join(userData, "library")).init();
  await profiles.rename("principal", "Agendei");
  const main = await profiles.store("principal");
  for (const [i, d] of [9, 7, 5, 3, 1].entries()) await main.saveAnalytics({ accountId: "ca_agendei", days: 7, followers: 2180 + i * 38, updatedAt: ago(d) });
  const doce = await profiles.create("Doce Ofício");
  const doceProject = await nicheProject("confeiteira");
  await writeFile(join(profiles.folder(doce.id), "state.json"), JSON.stringify({ profile: await nicheProfile("confeiteira", "Doce Ofício"), onboarding: emptyOnboarding(), ideas: [], projects: [doceProject], media: { displayName: "Doce Ofício", handle: "doce.oficio", verified: false, avatar: "", faces: [], scenes: [], assets: [] }, settings: { weeklyGoal: 4, driveFolder: "", firstCompletedAt: ago(20), lastReminderAt: ago(0) }, instagram: { defaults: ["ca_doce"] } }));

  const page = await rec.open(userData);
  page.setDefaultTimeout(20000);
  const nav = page.getByRole("navigation", { name: "Seções da marca" });
  const home = async () => { await page.evaluate(() => window.dispatchEvent(new CustomEvent("pacto:navigate", { detail: "home" }))); await rec.wait(900); };
  const openProject = async (title) => { await home(); await rec.click(page.getByRole("button", { name: `Abrir ${title}`, exact: true })); await rec.wait(1000); };

  rec.image("abertura", await rec.card("itens", cardHtml({ eyebrow: "AULA 10 · NOVO NO CARROSSELL 0.6", title: "Postar e agendar <em>no Instagram.</em>", items: [["1", "Conectar o Instagram"], ["2", "Postar em uma ou várias contas"], ["3", "Agendar com o app fechado"], ["4", "Ver os números de cada post"]], letter: "O" })));

  rec.mark("conectar");
  await rec.click(page.getByRole("button", { name: "Conectar Instagram" }).first());
  const modal = page.getByRole("dialog", { name: "Conectar Instagram" });
  await modal.waitFor();
  await rec.wait(1600);
  await rec.type(modal.getByLabel("Chave de API do Composio"), KEY, 35);
  await rec.click(modal.getByRole("button", { name: /Salvar chave/ }));
  await modal.getByText("@agendei.clinicas").waitFor({ timeout: 30000 });
  await rec.wait(900);
  await rec.click(modal.locator(".ig-account").filter({ hasText: "@agendei.app" }).getByRole("checkbox"));
  await rec.wait(1300);
  await rec.click(modal.getByRole("button", { name: "Fechar janela" }));
  await rec.wait(600);

  rec.mark("postar");
  await openProject(post.title);
  await rec.click(page.getByRole("navigation", { name: "Etapas" }).getByRole("button", { name: "Publicar" }));
  const box = page.getByLabel("Postar no Instagram");
  await rec.point(box, 700);
  await rec.click(box.getByRole("button", { name: "@agendei.clinicas" }));
  await rec.click(box.getByRole("button", { name: /Postar agora em 2 contas/ }));
  await rec.wait(1400);
  await rec.click(box.getByRole("button", { name: "Publicar" }));
  await box.getByText(/@agendei.clinicas · postado em/).waitFor({ timeout: 60000 });
  await rec.wait(1800);

  rec.mark("agendar");
  await openProject(later.title);
  await rec.click(page.getByRole("navigation", { name: "Etapas" }).getByRole("button", { name: "Publicar" }));
  const box2 = page.getByLabel("Postar no Instagram");
  await rec.click(box2.getByRole("button", { name: "Agendar" }));
  await rec.point(box2.getByLabel("Data e hora"), 1200);
  await rec.click(box2.getByRole("button", { name: "Agendar" }));
  await box2.getByText(/Agendado para/).waitFor({ timeout: 30000 });
  await rec.wait(1800);
  // A tarefa real do Windows criada pelo agendamento não fica para trás.
  await page.evaluate((id) => window.pacto.request("cancelSchedule", { id }), later.id).catch(() => {});

  rec.mark("metricas");
  await openProject(post.title);
  await rec.click(page.getByRole("navigation", { name: "Etapas" }).getByRole("button", { name: "Publicar" }));
  await rec.click(page.getByRole("tab", { name: "Resultado" }));
  await rec.click(page.getByLabel("Métricas do Instagram").getByRole("button", { name: /Atualizar/ }));
  await page.getByText("Compartilhamentos").first().waitFor({ timeout: 30000 });
  await rec.point(page.getByLabel("Métricas do Instagram"), 2200);

  rec.mark("analytics");
  await home();
  await rec.click(page.getByRole("button", { name: "Marca", exact: true }));
  await rec.click(nav.getByRole("button", { name: "Analytics", exact: true }));
  const panel = page.getByRole("region", { name: "Analytics do Instagram" });
  await panel.getByRole("heading", { name: "Posts que mais funcionaram" }).waitFor({ timeout: 60000 });
  await rec.wait(1200);
  await rec.point(panel.locator(".analytics-post").first(), 1500);
  await rec.point(panel.getByRole("button", { name: "Usar no Replicador", exact: true }).first(), 1800);

  rec.mark("perfis");
  await home();
  await rec.click(page.getByRole("button", { name: /^Perfil: Agendei/ }));
  await rec.wait(900);
  await rec.click(page.getByRole("menuitemradio", { name: "Doce Ofício" }));
  await page.getByRole("button", { name: /^Perfil: Doce Ofício/ }).waitFor();
  await rec.wait(2200);
  await rec.click(page.getByRole("button", { name: /^Perfil: Doce Ofício/ }));
  await rec.click(page.getByRole("menuitemradio", { name: "Agendei" }));
  await page.getByRole("button", { name: /^Perfil: Agendei/ }).waitFor();
  await rec.wait(1200);

  rec.mark("agentes");
  const card = page.getByRole("region", { name: "Usar com um agente" });
  await rec.point(card, 1200);
  await rec.click(card.getByRole("button", { name: "Configurar em 1 minuto" }));
  const agents = page.getByRole("dialog", { name: "Use o Carrossell pelo seu agente" });
  await agents.waitFor();
  await rec.wait(1500);
  await rec.point(agents.locator(".agent-prompt").first(), 2200);
  await rec.click(agents.getByRole("button", { name: "Fechar janela" }));

  rec.mark("acao");
  await home();
  await rec.point(page.getByRole("button", { name: /Instagram: \d contas/ }), 2200);
  await rec.wait(800);
  await rec.close();
} finally {
  await rec.finish();
  fake.close();
}
console.log("aula-10 gravada");

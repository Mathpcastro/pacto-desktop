import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createServer as createHttp } from "node:http";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { _electron } from "@playwright/test";
import { createServer } from "vite";

// Prova do Instagram no Electron real contra um Composio FALSO local (PACTO_COMPOSIO_URL, só em
// desenvolvimento): botão do topo, modal, contas já conectadas sem reconectar, conta nova, postar em
// duas contas, métricas e agendamento com tarefa real do Windows (cancelada). Nada é publicado.
// Uso: node scripts/instagram-proof.mjs [pasta-de-saída]
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] || join(root, ".cache", "instagram-proof"));
await mkdir(out, { recursive: true });
const KEY = "ak_prova_local_123456";
const accounts = [
  { id: "ca_ana", user_id: "default", info: { id: "1001", user_id: "1001", username: "ana.doces", account_type: "BUSINESS", followers_count: 2300 } },
  { id: "ca_loja", user_id: "outro-app", info: { id: "1002", user_id: "1002", username: "loja.oficial", account_type: "MEDIA_CREATOR", followers_count: 640 } },
];
const received = { puts: [], tools: [] };
const fake = createHttp(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks);
  const send = (value, code = 200) => (res.writeHead(code, { "content-type": "application/json" }), res.end(JSON.stringify(value)));
  if (req.method === "PUT") return received.puts.push({ type: req.headers["content-type"], jpeg: raw[0] === 0xff && raw[1] === 0xd8, size: raw.length }), res.end();
  if (req.headers["x-api-key"] !== KEY) return send({ error: { message: "Invalid API key" } }, 401);
  const body = raw.length ? JSON.parse(raw) : {};
  const path = req.url.replace("/api/v3.1", "");
  if (path === "/tool_router/session") return send({ session_id: "trs_1" });
  if (path.endsWith("/link")) {
    accounts.push({ id: "ca_nova", user_id: body.user_id, info: { id: "1003", user_id: "1003", username: "nova.conta", account_type: "BUSINESS", followers_count: 12 } });
    return send({ redirect_url: "https://connect.composio.dev/link/prova", connected_account_id: "ca_nova" });
  }
  if (path.startsWith("/connected_accounts?")) return send({ items: accounts.map((a) => ({ id: a.id, user_id: a.user_id, status: "ACTIVE", toolkit: { slug: "instagram" } })), next_cursor: null });
  if (path.startsWith("/connected_accounts/")) return send({ status: "ACTIVE" });
  if (path === "/files/upload/request") return send({ key: `prova/${body.filename}`, new_presigned_url: `http://127.0.0.1:${fake.address().port}/storage/${body.filename}`, metadata: { storage_backend: "s3" } });
  if (path.startsWith("/tools/execute/")) {
    const slug = path.slice("/tools/execute/".length);
    const account = accounts.find((a) => a.id === body.connected_account_id);
    received.tools.push([slug, account.info.username]);
    const media = `media-${account.info.id}`;
    const data = {
      INSTAGRAM_GET_USER_INFO: account.info,
      INSTAGRAM_GET_IG_USER_CONTENT_PUBLISHING_LIMIT: { data: [{ quota_usage: 1, config: { quota_total: 100 } }] },
      INSTAGRAM_CREATE_CAROUSEL_CONTAINER: { id: `container-${account.info.id}` },
      INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH: { id: media },
      INSTAGRAM_GET_IG_MEDIA: { id: media, permalink: `https://www.instagram.com/p/${media}/`, like_count: account.info.id === "1001" ? 128 : 41, comments_count: 34, saved_count: 51, shares_count: 9, view_count: 2100 },
      INSTAGRAM_GET_IG_MEDIA_INSIGHTS: { data: [{ name: "reach", values: [{ value: 1700 }] }] },
    }[slug];
    return send({ data: data || {}, error: null, successful: true });
  }
  send({ error: { message: `rota ${path}` } }, 404);
});
await new Promise((r) => fake.listen(0, "127.0.0.1", r));
const userData = await mkdtemp(join(tmpdir(), "carrossell-ig-"));
const server = await createServer({ root, logLevel: "error", server: { host: "127.0.0.1", port: 0, strictPort: false } });
await server.listen();
const env = { ...process.env, PACTO_USER_DATA: userData, PACTO_DEV_URL: `http://127.0.0.1:${server.httpServer.address().port}`, PACTO_COMPOSIO_URL: `http://127.0.0.1:${fake.address().port}` };
const app = await _electron.launch({ args: ["."], cwd: root, env });
const step = (name) => console.log("✔", name);
const run = promisify(execFile);
try {
  const page = await app.firstWindow();
  await page.waitForFunction(() => window.pacto);
  // Dois carrosséis prontos no estilo Tweet (renderizados pelo app, sem IA).
  const ids = await page.evaluate(async () => {
    const r = (a, x) => window.pacto.request(a, x);
    await r("saveProfile", { profile: { brand: "Ana Doces", brandContext: "# CONTEXTO\n\n" + "público. ".repeat(30), designKit: "# DESIGN KIT\n\n" + "regra. ".repeat(30) } });
    const made = [];
    for (const title of ["Primeiro post", "Post agendado"]) {
      const p = await r("createProject", { title, brief: "x", style: "tweet" });
      await r("saveProject", { id: p.id, caption: `Legenda do ${title}.`, slides: [{ id: "a", role: "Capa", title, body: "" }, { id: "b", role: "CTA", title: "Comente QUERO", body: "" }] });
      await r("approveText", { id: p.id });
      const c = await r("generateCovers", { id: p.id });
      await r("chooseCover", { id: p.id, optionId: c.coverOptions[0].id });
      made.push(p.id);
    }
    return made;
  });
  await page.reload();
  const topButton = page.getByRole("button", { name: "Conectar Instagram" }).first();
  await topButton.waitFor();
  await page.locator(".topbar").screenshot({ path: join(out, "01-topo.png") });
  await topButton.click();
  const modal = page.getByRole("dialog", { name: "Conectar Instagram" });
  await modal.waitFor();
  await page.screenshot({ path: join(out, "02-modal.png") });
  step("botão Conectar Instagram no topo abre o modal com o passo a passo");

  await modal.getByLabel("Chave de API do Composio").fill(KEY);
  await modal.getByRole("button", { name: /Salvar chave/ }).click();
  await modal.getByText("@loja.oficial").waitFor({ timeout: 15000 });
  assert.ok(!received.tools.length || received.tools.every(([slug]) => slug === "INSTAGRAM_GET_USER_INFO"));
  await modal.getByRole("checkbox", { name: /Padrão em/ }).first().check();
  await modal.getByRole("checkbox", { name: /Padrão em/ }).first().isChecked();
  step("as contas que já estavam no Composio aparecem sem reconectar");
  await modal.getByRole("button", { name: /Conectar outra conta/ }).click();
  await modal.getByText("@nova.conta").waitFor({ timeout: 15000 });
  await page.screenshot({ path: join(out, "03-contas.png") });
  step("conectar outra conta adiciona à lista");
  await modal.getByRole("button", { name: "Fechar janela" }).click();
  await page.getByRole("button", { name: /Instagram: 3 contas conectadas/ }).waitFor();
  await page.locator(".topbar").screenshot({ path: join(out, "04-topo-conectado.png") });

  await page.getByRole("button", { name: "Abrir Primeiro post" }).click();
  const box = page.getByLabel("Postar no Instagram");
  await box.getByRole("button", { name: "@loja.oficial" }).click();
  await box.screenshot({ path: join(out, "05-escolher-contas.png") });
  await box.getByRole("button", { name: /Postar agora em 2 contas/ }).click();
  await box.getByText(/@ana.doces, @loja.oficial/).waitFor();
  await box.getByRole("button", { name: "Publicar" }).click();
  await box.getByText(/@loja.oficial · postado em/).waitFor({ timeout: 20000 });
  await box.screenshot({ path: join(out, "06-postado.png") });
  assert.equal(received.puts.length, 4, "2 cards × 2 contas");
  assert.ok(received.puts.every((p) => p.jpeg && p.type === "image/jpeg"), "as imagens enviadas são JPEG de verdade");
  const published = received.tools.filter(([slug]) => slug === "INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH").map(([, user]) => user);
  assert.deepEqual(published, ["ana.doces", "loja.oficial"]);
  step("postar em duas contas de uma vez, com confirmação listando os @");

  await page.getByRole("tab", { name: "Resultado" }).click();
  await page.getByRole("button", { name: /Atualizar/ }).click();
  await page.getByText("Compartilhamentos").first().waitFor();
  await page.getByLabel("Métricas do Instagram").screenshot({ path: join(out, "07-metricas.png") });
  step("métricas por conta no Resultado");

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("pacto:navigate", { detail: "home" })));
  await page.getByRole("button", { name: "Abrir Post agendado" }).click();
  const box2 = page.getByLabel("Postar no Instagram");
  await box2.getByRole("button", { name: "Agendar" }).click();
  await box2.getByRole("button", { name: "Agendar" }).click();
  await box2.getByText(/Agendado para/).waitFor({ timeout: 15000 });
  await box2.screenshot({ path: join(out, "08-agendado.png") });
  const task = `Carrossell\\post-${ids[1]}`;
  assert.match((await run("schtasks.exe", ["/Query", "/TN", task, "/XML"], { windowsHide: true })).stdout, /--publicar-agendados/);
  await box2.getByRole("button", { name: "Cancelar" }).click();
  await box2.getByRole("button", { name: /Postar agora/ }).waitFor();
  assert.ok(await run("schtasks.exe", ["/Query", "/TN", task], { windowsHide: true }).then(() => false, () => true), "cancelar remove a tarefa do Windows");
  step("agendar cria a tarefa real do Windows e cancelar remove");
} finally {
  await app.close().catch(() => {});
  await server.close();
  fake.close();
  await rm(userData, { recursive: true, force: true }).catch(() => {});
}

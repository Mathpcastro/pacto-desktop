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
// desenvolvimento): configurar a chave, conectar, postar com confirmação, agendar (tarefa real do
// Windows, cancelada em seguida) e ver as métricas. Nada é publicado de verdade.
// Uso: node scripts/instagram-proof.mjs [pasta-de-saída]
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] || join(root, ".cache", "instagram-proof"));
await mkdir(out, { recursive: true });
const KEY = "ak_prova_local_123456";
const received = { puts: [], tools: [] };
const fake = createHttp(async (req, res) => {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks);
  const send = (value, code = 200) => (res.writeHead(code, { "content-type": "application/json" }), res.end(JSON.stringify(value)));
  if (req.method === "PUT") return received.puts.push({ path: req.url, type: req.headers["content-type"], jpeg: raw[0] === 0xff && raw[1] === 0xd8, size: raw.length }), res.end();
  if (req.headers["x-api-key"] !== KEY) return send({ error: { message: "Invalid API key" } }, 401);
  const body = raw.length ? JSON.parse(raw) : {};
  const path = req.url.replace("/api/v3.1", "");
  if (path === "/tool_router/session") return send({ session_id: "trs_1" });
  if (path.endsWith("/link")) return send({ redirect_url: "https://connect.composio.dev/link/prova", connected_account_id: "ca_prova" });
  if (path.startsWith("/connected_accounts/")) return send({ status: "ACTIVE" });
  if (path === "/files/upload/request") return send({ key: `prova/${body.filename}`, new_presigned_url: `http://127.0.0.1:${fake.address().port}/storage/${body.filename}`, metadata: { storage_backend: "s3" } });
  if (path.endsWith("/execute")) {
    received.tools.push(body.tool_slug);
    const data = {
      INSTAGRAM_GET_USER_INFO: { id: "17841400000000001", user_id: "17841400000000001", username: "ana.doces", account_type: "BUSINESS", followers_count: 2300 },
      INSTAGRAM_GET_IG_USER_CONTENT_PUBLISHING_LIMIT: { data: [{ quota_usage: 1, config: { quota_total: 100 } }] },
      INSTAGRAM_CREATE_CAROUSEL_CONTAINER: { id: "18000000000000001" },
      INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH: { id: "18000000000000999" },
      INSTAGRAM_GET_IG_MEDIA: { id: "18000000000000999", permalink: "https://www.instagram.com/p/PROVA/", like_count: 128, comments_count: 34, saved_count: 51, shares_count: 9, view_count: 2100 },
      INSTAGRAM_GET_IG_MEDIA_INSIGHTS: { data: [{ name: "reach", values: [{ value: 1700 }] }] },
    }[body.tool_slug];
    return send({ result_type: "completed", data: data || {}, error: null, log_id: "l" });
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
  await page.getByRole("button", { name: /^Marca$/ }).click();
  const section = page.getByRole("region", { name: "Instagram" });
  await section.scrollIntoViewIfNeeded();
  await section.screenshot({ path: join(out, "01-sem-chave.png") });
  await section.getByLabel("Chave de API do Composio").fill(KEY);
  await section.getByRole("button", { name: /Salvar chave/ }).click();
  await section.getByRole("button", { name: /Conectar o Instagram deste perfil/ }).click();
  await section.getByText("@ana.doces conectado a este perfil").waitFor({ timeout: 15000 });
  await section.screenshot({ path: join(out, "02-conectado.png") });
  step("chave salva e conta conectada a este perfil");

  await page.getByRole("button", { name: /Início/ }).click();
  await page.getByRole("button", { name: "Abrir Primeiro post" }).click();
  const box = page.getByLabel("Postar no Instagram");
  await box.getByRole("button", { name: /Postar agora em @ana.doces/ }).click();
  await box.screenshot({ path: join(out, "03-confirmar.png") });
  await box.getByRole("button", { name: "Publicar" }).click();
  await box.getByText(/Postado em/).waitFor({ timeout: 20000 });
  await box.screenshot({ path: join(out, "04-postado.png") });
  assert.equal(received.puts.length, 2);
  assert.ok(received.puts.every((p) => p.jpeg && p.type === "image/jpeg"), "as imagens enviadas são JPEG de verdade");
  assert.deepEqual(received.tools.slice(-4), ["INSTAGRAM_GET_IG_USER_CONTENT_PUBLISHING_LIMIT", "INSTAGRAM_CREATE_CAROUSEL_CONTAINER", "INSTAGRAM_POST_IG_USER_MEDIA_PUBLISH", "INSTAGRAM_GET_IG_MEDIA"]);
  step(`postar com confirmação: ${received.puts.length} JPEGs (${received.puts.map((p) => Math.round(p.size / 1024) + " KB").join(", ")}) e carrossel publicado`);

  await page.getByRole("tab", { name: "Resultado" }).click();
  await page.getByRole("button", { name: /Atualizar/ }).click();
  await page.getByText("Compartilhamentos").waitFor();
  await page.getByLabel("Métricas do Instagram").screenshot({ path: join(out, "05-metricas.png") });
  step("métricas do Instagram no Resultado");

  await page.evaluate(() => window.dispatchEvent(new CustomEvent("pacto:navigate", { detail: "home" })));
  await page.getByRole("button", { name: "Abrir Post agendado" }).click();
  const box2 = page.getByLabel("Postar no Instagram");
  await box2.getByRole("button", { name: "Agendar" }).click();
  await box2.getByRole("button", { name: "Agendar" }).click();
  await box2.getByText(/Agendado para/).waitFor({ timeout: 15000 });
  await box2.screenshot({ path: join(out, "06-agendado.png") });
  const task = `Carrossell\\post-${ids[1]}`;
  const xml = (await run("schtasks.exe", ["/Query", "/TN", task, "/XML"], { windowsHide: true })).stdout;
  assert.match(xml, /--publicar-agendados/);
  step("agendar criou a tarefa real no Agendador do Windows");
  await box2.getByRole("button", { name: "Cancelar" }).click();
  await box2.getByRole("button", { name: /Postar agora/ }).waitFor();
  const gone = await run("schtasks.exe", ["/Query", "/TN", task], { windowsHide: true }).then(() => false, () => true);
  assert.ok(gone, "cancelar remove a tarefa do Windows");
  step("cancelar o agendamento remove a tarefa");
} finally {
  await app.close().catch(() => {});
  await server.close();
  fake.close();
  await rm(userData, { recursive: true, force: true }).catch(() => {});
}

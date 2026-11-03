import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer as createHttpServer } from "node:http";
import { tmpdir } from "node:os";
import { dirname, join, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron, expect } from "@playwright/test";
import { createServer } from "vite";

// Electron, preload, IPC, secrets and persistence are production code. Only the
// Telegram HTTP transport is a loopback fixture; no real account or delivery.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, ".cache", "autopilot-proof");
await mkdir(out, { recursive: true });
const userData = await mkdtemp(join(tmpdir(), "carrossell-autopilot-proof-"));
const syntheticToken = "123456:THIS_IS_A_SYNTHETIC_PROOF_TOKEN_000000";
const checks = [], pageErrors = [], methods = {}, delivered = [], queue = [], waiting = new Set();
const children = new Set();
const cleanError = (error) => String(error?.message || error).replace(/\b\d{5,}:[A-Za-z0-9_-]+/g, "[token omitido]").split("\n").slice(0, 5).join(" ");
const pause = (ms) => new Promise((resolvePause) => setTimeout(resolvePause, ms));
const reply = (response, result) => {
  if (!response.destroyed && !response.writableEnded) {
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ ok: true, result }));
  }
};
const flushUpdates = () => {
  for (const poll of waiting) {
    const updates = queue.filter((update) => update.update_id >= poll.offset);
    if (!updates.length) continue;
    clearTimeout(poll.timer);
    waiting.delete(poll);
    reply(poll.response, updates);
  }
};
let messageId = 0, application, page, fatal;
const lifecycle = {};
const telegram = createHttpServer(async (request, response) => {
  try {
    assert.equal(request.method, "POST");
    assert.ok(request.url.startsWith(`/bot${syntheticToken}/`), "Only the synthetic credential is accepted");
    const method = request.url.split("/").at(-1);
    methods[method] = (methods[method] || 0) + 1;
    let raw = "";
    for await (const chunk of request) raw += chunk;
    const body = JSON.parse(raw || "{}");
    if (method === "getMe") return reply(response, { id: 123456, is_bot: true, first_name: "Carrossell proof", username: "carrossell_test_bot" });
    if (method === "getWebhookInfo") return reply(response, { url: "", pending_update_count: 0 });
    if (method === "getUpdates") {
      const offset = body.offset || 0;
      const updates = queue.filter((update) => update.update_id >= offset);
      if (updates.length) return reply(response, updates);
      const poll = { response, offset };
      poll.timer = setTimeout(() => { waiting.delete(poll); reply(response, []); }, 1000);
      waiting.add(poll);
      response.on("close", () => { clearTimeout(poll.timer); waiting.delete(poll); });
      return;
    }
    if (method === "sendMessage") {
      delivered.push({ chatId: body.chat_id, text: body.text });
      return reply(response, { message_id: ++messageId, chat: { id: body.chat_id, type: "private" }, text: body.text });
    }
    throw new Error(`Unexpected Telegram method: ${method}`);
  } catch (error) {
    checks.push({ name: "transporte Telegram local", passed: false, error: cleanError(error) });
    if (!response.writableEnded) { response.writeHead(400, { "Content-Type": "application/json" }); response.end(JSON.stringify({ ok: false, error_code: 400 })); }
  }
});
const vite = await createServer({ root, logLevel: "error", server: { host: "127.0.0.1", port: 0, strictPort: false } });
const env = { ...process.env, PACTO_USER_DATA: userData, PACTO_AUTOPILOT_NO_TASKS: "1" };
delete env.ELECTRON_RUN_AS_NODE;
async function check(name, verify) {
  try { await verify(); checks.push({ name, passed: true }); }
  catch (error) { checks.push({ name, passed: false, error: cleanError(error) }); }
}
const bootstrap = () => page.evaluate(() => window.pacto.request("bootstrap"));
async function openPilot() {
  await page.getByRole("button", { name: "Marca", exact: true }).click();
  await page.getByRole("button", { name: "Piloto automático", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Piloto automático", exact: true })).toBeVisible();
}
function observePage(target) { target.on("pageerror", (error) => pageErrors.push(cleanError(error))); }
const profile = { brand: "Prova local do piloto", product: "Teste de interface", audience: "Verificação de software", brandContext: "Marca fictícia usada somente para verificar configuração e persistência. Nenhuma geração ou publicação autorizada nesta prova.", designKit: "Fundo branco, texto preto, destaque azul. Sem fotos e sem geração de arte nesta prova." };

try {
  await new Promise((resolveListen) => telegram.listen(0, "127.0.0.1", resolveListen));
  await vite.listen();
  env.PACTO_TELEGRAM_URL = `http://127.0.0.1:${telegram.address().port}`;
  env.PACTO_DEV_URL = `http://127.0.0.1:${vite.httpServer.address().port}`;
  application = await _electron.launch({ args: ["."], cwd: root, env });
  page = await application.firstWindow();
  observePage(page);
  await page.getByRole("region", { name: "Configuração do projeto" }).waitFor();
  await page.evaluate((value) => window.pacto.request("saveProfile", { profile: value }), profile);
  await page.reload();
  await page.getByRole("heading", { name: "O que vamos publicar hoje?" }).waitFor();
  const initial = await bootstrap();
  const firstProfile = initial.profileId;
  await check("instalação temporária começa sem contas reais", async () => {
    assert.equal(initial.account.connected, false);
    assert.equal(initial.autopilot.hasToken, false);
    assert.equal(initial.composio.accounts.length, 0);
  });
  await openPilot();
  await page.screenshot({ path: join(out, "01-disconnected.png"), fullPage: true });
  const tokenInput = page.getByLabel("Token do bot do Telegram", { exact: true });
  await check("campo de token é protegido e não oferece preenchimento automático", async () => {
    await expect(tokenInput).toHaveAttribute("type", "password");
    await expect(tokenInput).toHaveAttribute("autocomplete", "off");
  });
  await tokenInput.fill(syntheticToken);
  await page.getByRole("button", { name: "Conectar bot", exact: true }).click();
  await expect(page.getByText("@carrossell_test_bot", { exact: true })).toBeVisible();
  await check("salvar valida o bot por HTTP local e limpa o token", async () => {
    const state = await bootstrap();
    assert.equal(state.autopilot.hasToken, true);
    assert.equal(state.autopilot.paired, false);
    assert.equal(state.autopilot.bot.username, "carrossell_test_bot");
    assert.equal(JSON.stringify(state).includes(syntheticToken), false);
    assert.equal(methods.getMe, 1);
    assert.equal(methods.getWebhookInfo, 1);
    await page.getByRole("button", { name: "Trocar bot", exact: true }).click();
    await expect(tokenInput).toHaveValue("");
    await page.getByRole("button", { name: "Cancelar", exact: true }).click();
    assert.equal(await page.evaluate((value) => Object.values(localStorage).some((entry) => String(entry).includes(value)), syntheticToken), false);
  });
  await page.getByRole("button", { name: "Vincular minha conversa", exact: true }).click();
  await expect(page.getByRole("button", { name: "Abrir bot no Telegram", exact: true })).toBeVisible();
  let pendingPair = (await bootstrap()).autopilot.pairing;
  await check("vínculo expõe somente o link e código produzidos pelo serviço", async () => {
    assert.match(pendingPair.code, /^[a-f0-9]{32}$/);
    assert.equal(pendingPair.url, `https://t.me/carrossell_test_bot?start=${pendingPair.code}`);
    assert.ok(new Date(pendingPair.expiresAt).getTime() > Date.now());
    await expect(page.getByText(pendingPair.code, { exact: true })).toBeVisible();
    await expect(page.getByText(pendingPair.url, { exact: true })).toBeVisible();
  });
  await page.getByRole("button", { name: "Gerar novo código", exact: true }).click();
  await expect.poll(async () => (await bootstrap()).autopilot.pairing.code).not.toBe(pendingPair.code);
  pendingPair = (await bootstrap()).autopilot.pairing;
  await page.screenshot({ path: join(out, "02-pairing.png"), fullPage: true });

  await check("fechar última janela mantém vínculo ativo e segunda instância real reabre a mesma instalação", async () => {
    const child = application.process();
    const windowsBefore = await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length);
    assert.equal(windowsBefore, 1);
    await page.close();
    await pause(2000);
    assert.equal(child.exitCode, null, "processo encerrou durante vínculo pendente");
    assert.equal(await application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().length), 0);
    const electronExe = await application.evaluate(() => process.execPath);
    lifecycle.launcher = child.spawnfile;
    lifecycle.electronExe = electronExe;
    const second = spawn(electronExe, [root], { cwd: root, env, windowsHide: true, stdio: ["ignore", "pipe", "pipe"] });
    lifecycle.secondOutput = [];
    for (const stream of [second.stdout, second.stderr]) stream.on("data", (chunk) => lifecycle.secondOutput.push(cleanError(chunk.toString())));
    second.on("error", (error) => { lifecycle.secondError = cleanError(error); });
    children.add(second);
    second.once("exit", (code) => { lifecycle.secondExitCode = code; children.delete(second); });
    await expect.poll(() => application.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows().filter((window) => !window.isDestroyed()).length), { timeout: 20000 }).toBe(1);
    await expect.poll(() => application.windows().filter((window) => !window.isClosed()).length, { timeout: 10000 }).toBe(1);
    page = application.windows().find((window) => !window.isClosed());
    observePage(page);
    await page.getByRole("heading", { name: "O que vamos publicar hoje?" }).waitFor();
    assert.equal((await bootstrap()).autopilot.pairing.code, pendingPair.code);
    await openPilot();
    await expect(page.getByText(pendingPair.code, { exact: true })).toBeVisible();
  });

  queue.push({ update_id: 1, message: { message_id: 1, date: Math.floor(Date.now() / 1000), chat: { id: 42, type: "private" }, from: { id: 7, is_bot: false, first_name: "Prova" }, text: `/start ${pendingPair.code}` } });
  flushUpdates();
  await expect(page.getByText("Sua conversa está vinculada. Os pedidos de aprovação chegam nela.", { exact: true })).toBeVisible({ timeout: 15000 });
  await check("polling vincula a conversa privada e envia confirmação apenas ao servidor local", async () => {
    const state = await bootstrap();
    assert.equal(state.autopilot.paired, true);
    assert.equal(state.autopilot.pairing, null);
    assert.ok(methods.getUpdates >= 1);
    assert.equal(delivered.length, 1);
    assert.equal(delivered[0].chatId, 42);
    assert.match(delivered[0].text, /Telegram conectado ao Carrossell/);
  });
  const save = page.getByRole("button", { name: "Salvar rotina", exact: true });
  const cards = page.getByLabel("Quantidade de cards, de 2 a 10", { exact: true });
  await check("cards aceitam apenas 2 a 10 na interface", async () => {
    await expect(cards).toHaveAttribute("min", "2");
    await expect(cards).toHaveAttribute("max", "10");
    await cards.fill("1"); await expect(save).toBeDisabled();
    await cards.fill("11"); await expect(save).toBeDisabled();
    await cards.fill("2"); await expect(save).toBeEnabled();
    await save.click();
    await expect.poll(async () => (await bootstrap()).autopilot.config.cardCount).toBe(2);
    await cards.fill("10"); await expect(save).toBeEnabled();
  });
  await check("nenhum dia selecionado impede salvar", async () => {
    for (const name of ["Segunda", "Terça", "Quarta", "Quinta", "Sexta"]) await page.getByRole("button", { name, exact: true }).click();
    await expect(save).toBeDisabled();
    await page.getByRole("button", { name: "Terça", exact: true }).click();
    await page.getByRole("button", { name: "Quinta", exact: true }).click();
    await expect(save).toBeEnabled();
  });
  await page.getByLabel("Horário da rotina", { exact: true }).fill("18:35");
  await page.getByLabel("Estilo do carrossel", { exact: true }).selectOption("tweet");
  await save.click();
  await expect.poll(async () => (await bootstrap()).autopilot.config.time).toBe("18:35");
  await check("rotina pausada salva dias, horário, estilo e 10 cards sem conta de Instagram", async () => {
    const config = (await bootstrap()).autopilot.config;
    assert.equal(config.enabled, false);
    assert.equal(config.time, "18:35");
    assert.deepEqual(config.days, [2, 4]);
    assert.equal(config.style, "tweet");
    assert.equal(config.cardCount, 10);
    assert.deepEqual(config.accounts, []);
    assert.equal(config.nextAt, null);
    await expect(page.getByRole("button", { name: "Ativar rotina", exact: true })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Gerar agora", exact: true })).toBeDisabled();
  });
  await page.screenshot({ path: join(out, "03-paired-paused.png"), fullPage: true });
  await check("recarregar conserva rotina e vínculo sem expor token", async () => {
    await page.reload();
    await page.getByRole("heading", { name: "O que vamos publicar hoje?" }).waitFor();
    await openPilot();
    await expect(page.getByLabel("Horário da rotina", { exact: true })).toHaveValue("18:35");
    await expect(cards).toHaveValue("10");
    assert.equal((await bootstrap()).autopilot.paired, true);
    assert.equal((await page.locator("body").innerText()).includes(syntheticToken), false);
  });
  await check("troca de perfil descarta o rascunho e mantém configuração isolada", async () => {
    const secondId = await page.evaluate(async (value) => {
      const result = await window.pacto.request("createProfile", { name: "Segundo perfil de prova", activate: false });
      const id = result.createdProfile.id;
      await window.pacto.request("saveProfile", { profileId: id, profile: { ...value, brand: "Segunda marca fictícia" } });
      return id;
    }, profile);
    await page.getByLabel("Horário da rotina", { exact: true }).fill("22:12");
    await page.getByRole("button", { name: /Perfil:.*Trocar de perfil/ }).click();
    await page.getByRole("menuitemradio", { name: "Segundo perfil de prova", exact: true }).click();
    await openPilot();
    assert.equal((await bootstrap()).profileId, secondId);
    await expect(page.getByLabel("Horário da rotina", { exact: true })).toHaveValue("09:00");
    await expect(cards).toHaveValue("6");
    assert.equal((await bootstrap()).autopilot.paired, true);
    await page.getByRole("button", { name: /Perfil:.*Trocar de perfil/ }).click();
    const firstName = (await bootstrap()).profiles.find((item) => item.id === firstProfile).name;
    await page.getByRole("menuitemradio", { name: firstName, exact: true }).click();
    await openPilot();
    await expect(page.getByLabel("Horário da rotina", { exact: true })).toHaveValue("18:35");
    await expect(cards).toHaveValue("10");
  });
  await check("telas clara e escura não geram overflow horizontal", async () => {
    for (const theme of ["light", "dark"]) {
      await page.evaluate((value) => { document.documentElement.dataset.theme = value; }, theme);
      await page.setViewportSize({ width: 1000, height: 760 });
      await page.getByRole("button", { name: "Gerar agora", exact: true }).scrollIntoViewIfNeeded();
      await page.screenshot({ path: join(out, `04-configured-${theme}.png`), fullPage: true });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), false);
    }
  });
  await check("nenhuma geração, publicação, agendamento ou erro de página aconteceu", async () => {
    const state = await bootstrap();
    assert.equal(state.account.connected, false);
    assert.equal(state.projects.length, 0);
    assert.equal(state.autopilot.jobs.length, 0);
    assert.deepEqual(pageErrors, []);
    await expect(page.getByRole("alert")).toHaveCount(0);
    assert.deepEqual(Object.keys(methods).sort(), ["getMe", "getUpdates", "getWebhookInfo", "sendMessage"].sort());
  });
  await check("fixture isolada cobre rótulos finais e ações permitidas sem tocar o motor", async () => {
    // Mount the real component with fixture props and a request stub. The app's
    // renderer and its runtime state remain intact behind this temporary view.
    const mainModule = (await vite.transformRequest("/src/main.jsx")).code;
    const reactUrl = mainModule.match(/from "([^"\n]*\/react\.js[^"\n]*)"/)[1];
    const clientUrl = mainModule.match(/from "([^"\n]*\/react-dom_client\.js[^"\n]*)"/)[1];
    const fixtureRoot = await page.evaluateHandle(async ({ reactUrl, clientUrl }) => {
      const [reactModule, clientModule, { default: Autopilot }] = await Promise.all([import(reactUrl), import(clientUrl), import("/src/components/Autopilot.jsx")]);
      const React = reactModule.default || reactModule;
      const { createRoot } = clientModule.default || clientModule;
      document.querySelector("#root").style.display = "none";
      const element = document.createElement("div");
      element.id = "pilot-render-fixture";
      element.style.cssText = "position:fixed;inset:0;overflow:auto;padding:24px;background:var(--paper);z-index:9999";
      document.body.append(element);
      const root = createRoot(element);
      return {
        render(state) { root.render(React.createElement(Autopilot, { state, request: () => { throw new Error("Fixture must never request effects"); } })); },
        dispose() { root.unmount(); element.remove(); document.querySelector("#root").style.display = ""; },
      };
    }, { reactUrl, clientUrl });
    const cases = [
      ["sending", "Enviando prévia"], ["scheduleDate", "Esperando data"], ["scheduleConfirm", "Esperando confirmação"],
      ["approvedSchedule", "Agendamento aprovado"], ["scheduling", "Agendando"], ["redo", "Refazendo"],
      ["resend", "Reenviando prévia"], ["scheduled", "Agendado"], ["uncertain", "Confira o Instagram"],
      ["ready", "Esperando sua aprovação no Telegram"], ["error", "Precisa de atenção"], ["queued", "Na fila"],
    ];
    const discardable = new Set(["ready", "error", "queued", "scheduleDate", "scheduleConfirm"]);
    const before = await bootstrap();
    const beforeMethods = { ...methods };
    for (let start = 0; start < cases.length; start += 6) {
      const batch = cases.slice(start, start + 6);
      const state = { profileId: "fixture-only", account: { connected: false }, composio: { accounts: [] }, autopilot: { hasToken: false, paired: false, config: { enabled: false }, jobs: batch.map(([status], index) => ({ id: `fixture-${status}`, title: `Exemplo: ${status}`, status, createdAt: new Date(Date.UTC(2026, 10, 2, 12, index)).toISOString() })) } };
      await fixtureRoot.evaluate((view, state) => view.render(state), state);
      const fixture = page.locator("#pilot-render-fixture");
      for (const [status, label] of batch) {
        const item = fixture.locator(".pending-item").filter({ hasText: `Exemplo: ${status}` });
        await expect(item).toHaveCount(1);
        await expect(item.getByRole("status")).toHaveText(label);
        await expect(item.getByRole("button", { name: /^Descartar pedido:/ })).toHaveCount(discardable.has(status) ? 1 : 0);
        await expect(item.getByRole("button", { name: "Retomar", exact: true })).toHaveCount(status === "error" ? 1 : 0);
        if (status === "uncertain") await expect(item).toContainText("Confira no Instagram se o post saiu");
      }
      await fixture.locator(".pending-item").first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: join(out, `05-status-fixture-${start / 6 + 1}-top.png`), fullPage: true });
      await fixture.locator(".pending-item").last().scrollIntoViewIfNeeded();
      await page.screenshot({ path: join(out, `05-status-fixture-${start / 6 + 1}-bottom.png`), fullPage: true });
    }
    const after = await bootstrap();
    assert.deepEqual(after.autopilot.jobs, before.autopilot.jobs);
    assert.deepEqual(after.projects, before.projects);
    assert.equal(methods.sendMessage, beforeMethods.sendMessage);
    assert.equal(after.autopilot.config.enabled, false);
    await fixtureRoot.evaluate((view) => view.dispose());
    await fixtureRoot.dispose();
    assert.deepEqual(pageErrors, []);
  });
} catch (error) {
  fatal = cleanError(error);
  checks.push({ name: "execução completa da prova", passed: false, error: fatal });
  if (page && !page.isClosed()) await page.screenshot({ path: join(out, "failure.png"), fullPage: true }).catch(() => {});
} finally {
  if (application) {
    const child = application.process();
    const closed = application.waitForEvent("close", { timeout: 8000 }).catch(() => null);
    await application.evaluate(({ app }) => app.quit()).catch(() => {});
    await closed;
    if (child.exitCode === null) child.kill();
  }
  for (const child of children) if (child.exitCode === null) child.kill();
  for (const poll of waiting) { clearTimeout(poll.timer); reply(poll.response, []); }
  waiting.clear();
  telegram.closeAllConnections();
  await new Promise((resolveClose) => telegram.close(resolveClose));
  await vite.close();
  assert.ok(resolve(userData).startsWith(`${resolve(tmpdir())}${sep}carrossell-autopilot-proof-`), "Unexpected cleanup directory");
  await rm(userData, { recursive: true, force: true }).catch(() => {});
}
const failed = checks.filter((item) => !item.passed);
const result = { out, scope: "Electron real; Telegram HTTP falso local; sem contas, inferência ou envio real", passed: checks.length - failed.length, failed: failed.length, telegramMethods: methods, lifecycle, checks };
await writeFile(join(out, "results.json"), `${JSON.stringify(result, null, 2)}\n`);
console.log(JSON.stringify(result, null, 2));
if (fatal || failed.length) process.exitCode = 1;

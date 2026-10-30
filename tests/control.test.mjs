import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readFile, writeFile } from "node:fs/promises";
import { createConnection } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { startControl, connectControl, controlAddress, lean, userDataDir } from "../core/control.mjs";
import { main } from "../cli/carrossell.mjs";

// Controle local (CLI para agentes): token, ações permitidas, imagens fora da saída e o fluxo da CLI.
const png = "data:image/png;base64," + "A".repeat(400);
function fakeRuntime() {
  const calls = [];
  const project = { id: "p1", title: "Pauta", format: "carrossel", style: "ia", status: "draft", textApproved: false, brief: "B", messages: [], coverOptions: [], slides: [] };
  const state = () => ({ profileId: "principal", profiles: [{ id: "principal", name: "Principal" }, { id: "ana", name: "Cliente Ana" }], account: { connected: true }, profile: { brand: "Agendei" }, brandInfo: { name: "Agendei" }, projects: [structuredClone(project)], onboarding: { brand: { document: "" }, design: { document: "" } }, media: { faces: [], assets: [] }, feedback: [], ideas: [] });
  const runtime = {
    calls,
    job: null,
    project,
    async request(action, args = {}) {
      calls.push([action, args]);
      if (action === "bootstrap") return state();
      if (action === "profiles") return { active: "principal", profiles: state().profiles };
      if (action === "createProject") return { ...project, title: args.title };
      if (action === "generatePlan") {
        project.status = "planning";
        setTimeout(() => Object.assign(project, { status: "ready", slides: [{ id: "s1", index: 1, title: "Capa", body: "", state: "draft", image: png }], messages: [{ role: "assistant", text: "Pronto." }] }), 30);
        return { ...project, image: png };
      }
      return { ok: true, image: png };
    },
    inProfile: (_id, fn) => fn(),
    exportedFiles: async () => ({ "01.png": Buffer.from("png"), "legenda.txt": Buffer.from("legenda") }),
  };
  return runtime;
}
async function serve(t, runtime = fakeRuntime()) {
  const userData = await mkdtemp(join(tmpdir(), "carrossell-control-"));
  const control = await startControl({ userData, runtime, allowed: ["bootstrap", "profiles", "createProject", "generatePlan", "saveProject"], version: "9.9.9" });
  t.after(async () => { await control.close(); await rm(userData, { recursive: true, force: true }); });
  return { userData, control, runtime };
}
function capture(t) {
  const lines = [];
  const original = process.stdout.write;
  const err = process.stderr.write;
  process.stdout.write = (chunk) => (lines.push(String(chunk)), true);
  process.stderr.write = () => true;
  t.after(() => { process.stdout.write = original; process.stderr.write = err; });
  return () => JSON.parse(lines.join(""));
}

test("the data folder and pipe follow the app identity", () => {
  assert.equal(userDataDir({ APPDATA: "C:\\Users\\a\\AppData\\Roaming" }, "win32"), join("C:\\Users\\a\\AppData\\Roaming", "pacto-desktop"));
  assert.equal(userDataDir({}, "darwin", "/Users/a"), join("/Users/a", "Library", "Application Support", "pacto-desktop"));
  assert.match(controlAddress("C:\\x", "win32"), /^\\\\\.\\pipe\\carrossell-[0-9a-f]{16}$/);
  assert.notEqual(controlAddress("C:\\x", "win32"), controlAddress("C:\\y", "win32"));
});

test("images never reach the CLI output", () => {
  assert.deepEqual(lean({ a: png, b: [png, "data:x"], c: { d: "texto" } }), { a: "[imagem]", b: ["[imagem]", "data:x"], c: { d: "texto" } });
});

test("the control server answers with the token and refuses everything else", async (t) => {
  const { userData } = await serve(t);
  const client = await connectControl(userData);
  t.after(() => client.close());
  assert.equal((await client.call("ping")).version, "9.9.9");
  const status = await client.call("status");
  assert.equal(status.brandName, "Agendei");
  assert.equal(status.projects, 1);
  await assert.rejects(client.call("deleteEverything"), /Ação não permitida/);
  await assert.rejects(client.call("bootstrap", []), /Dados inválidos/);
  const result = await client.call("generatePlan", { id: "p1" });
  assert.equal(result.image, "[imagem]");
  // Sem o token certo, a conexão é recusada.
  const reply = await new Promise((resolve) => {
    const socket = createConnection(controlAddress(userData));
    socket.on("data", (d) => (resolve(JSON.parse(String(d))), socket.destroy()));
    socket.write(`${JSON.stringify({ id: 1, token: "x".repeat(64), action: "ping" })}\n`);
  });
  assert.deepEqual(reply, { id: 1, ok: false, error: "Acesso negado." });
});

test("subscribers receive app events without images", async (t) => {
  const { userData, control } = await serve(t);
  const client = await connectControl(userData);
  t.after(() => client.close());
  const events = [];
  await client.subscribe((e) => events.push(e));
  control.broadcast({ type: "project", project: { id: "p1", image: png } });
  await new Promise((r) => setTimeout(r, 50));
  assert.deepEqual(events, [{ type: "project", project: { id: "p1", image: "[imagem]" } }]);
});

test("export writes the files only into an absolute folder", async (t) => {
  const { userData } = await serve(t);
  const client = await connectControl(userData);
  t.after(() => client.close());
  await assert.rejects(client.call("exportTo", { id: "p1", folder: "relativa" }), /caminho completo/);
  const folder = join(userData, "saida");
  const result = await client.call("exportTo", { id: "p1", folder });
  assert.equal(result.files.length, 2);
  assert.equal(await readFile(join(folder, "legenda.txt"), "utf8"), "legenda");
});

test("CLI: criar writes the text and waits for it, with the profile resolved by name", async (t) => {
  const { userData, runtime } = await serve(t);
  const read = capture(t);
  const code = await main(["criar", "--pauta", "3 erros ao precificar", "--cards", "6", "--perfil", "ana"], { userData });
  assert.equal(code, 0);
  const out = read();
  assert.equal(out.status, "ready");
  assert.equal(out.slides[0].title, "Capa");
  assert.equal(out.slides[0].image, true, "a CLI diz se o card tem arte, sem mandar a imagem");
  assert.equal(out.lastReply, "Pronto.");
  const create = runtime.calls.find(([a]) => a === "createProject")[1];
  assert.deepEqual(create, { title: "3 erros ao precificar", brief: "3 erros ao precificar", cardCount: 6, profileId: "ana" });
});

test("CLI: usage errors explain what to type", async (t) => {
  const { userData } = await serve(t);
  capture(t);
  await assert.rejects(main(["criar"], { userData }), /--pauta/);
  await assert.rejects(main(["status", "--perfil", "Ninguém"], { userData }), /Perfil não encontrado/);
  await assert.rejects(main(["voar"], { userData }), /Comando desconhecido/);
});

test("CLI: the token file is required and is replaced on every start", async (t) => {
  const { userData } = await serve(t);
  const first = await readFile(join(userData, "control.token"), "utf8");
  assert.match(first, /^[0-9a-f]{64}$/);
  await writeFile(join(userData, "control.token"), "0".repeat(64));
  await assert.rejects(connectControl(userData).then((c) => c.call("ping")), /Acesso negado|encerrada/);
});

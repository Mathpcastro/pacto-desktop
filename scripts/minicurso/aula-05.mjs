import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT, Recorder } from "./lib.mjs";

// Aula 5 — T (interface 0.3): capas, restante, correção e o carrossel pronto, continuando
// o projeto da aula 4 (texto aprovado e três capas geradas de verdade).
const state = JSON.parse(await readFile(join(ROOT, ".cache", "minicurso", "aula-04", "estado-final.json"), "utf8"));
state.settings = { ...state.settings, firstCompletedAt: "" };
const rec = await new Recorder("aula-05").init();
try {
  const page = await rec.open(await rec.userData({ auth: true, state }));
  await rec.until(async () => (await window.pacto.request("bootstrap")).account?.connected, null, 120000);
  const idle = () => rec.until(async () => { const p = (await window.pacto.request("bootstrap")).projects[0]; return !["planning", "generating"].includes(p.status); }, null, 1500000);

  rec.mark("progresso");
  await rec.click(page.locator(".lib-open").first());
  await page.getByRole("heading", { name: "Qual capa faz você parar?" }).waitFor();
  await rec.point(page.locator(".covers-wrap .hint"), 2500);

  rec.mark("capa");
  await rec.point(page.getByRole("button", { name: /Gerar outras opções/ }), 1500);
  for (const cover of await page.locator(".cover-opt").all()) await rec.point(cover, 900);

  rec.mark("evitar");
  for (const cover of await page.locator(".cover-opt").all()) await rec.point(cover, 1600);

  rec.mark("referencia");
  await rec.click(page.locator(".cover-opt").first());
  await rec.click(page.getByRole("button", { name: "Usar esta capa" }));
  await rec.wait(1800);

  rec.mark("restante");
  await page.locator(".stage-frame").waitFor();
  await idle();
  await rec.wait(1500);

  rec.mark("correcao");
  await rec.click(page.locator(".thumb").nth(1));
  await rec.click(page.locator(".stage-frame"));
  await rec.click(page.getByRole("button", { name: "Título pequeno" }));
  await rec.click(page.getByRole("button", { name: "Corrigir este card" }));
  await idle();
  await rec.wait(1500);

  rec.mark("desatualizado");
  const title = page.getByRole("textbox", { name: "Título", exact: true });
  await rec.click(title);
  await page.keyboard.press("End");
  await title.pressSequentially("!", { delay: 80 });
  await rec.wait(2500);
  await rec.point(page.getByText("Texto mudou · atualizar"), 1500);
  await rec.click(page.getByRole("button", { name: /Gerar este card de novo/ }));
  await idle();
  await rec.wait(1200);

  rec.mark("pico");
  await rec.click(page.getByRole("button", { name: "Ir para publicar" }));
  await page.getByLabel("Prévia no Instagram").waitFor();
  for (let i = 0; i < 3; i++) { await rec.click(page.getByRole("button", { name: "Próximo card" })); await rec.wait(700); }
  await rec.wait(1500);

  rec.mark("acao");
  await rec.point(page.getByRole("button", { name: "Enviar para o celular" }), 3500);
  await rec.close();
} finally {
  await rec.finish();
}
console.log("aula-05 gravada");

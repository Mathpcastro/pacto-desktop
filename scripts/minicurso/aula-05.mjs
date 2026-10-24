import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT, Recorder } from "./lib.mjs";

// Aula 5 — T: capas, restante, correção e o primeiro carrossel pronto, continuando
// o projeto aprovado na aula 4. Os trechos são gravados na ordem natural do app e
// o montador os coloca na ordem do roteiro.
const state = JSON.parse(await readFile(join(ROOT, ".cache", "minicurso", "aula-04", "estado-final.json"), "utf8"));
state.settings = { ...state.settings, firstCompletedAt: "" };
const rec = await new Recorder("aula-05").init();
try {
  const page = await rec.open(await rec.userData({ auth: true, state }));
  await rec.until(async () => (await window.pacto.request("bootstrap")).account?.connected, null, 120000);
  const idle = () => rec.until(async () => { const p = (await window.pacto.request("bootstrap")).projects[0]; return !["planning", "generating"].includes(p.status); }, null, 1500000);

  rec.mark("progresso");
  await rec.click(page.locator(".project-card button").first());
  await page.getByRole("heading", { name: "Escolha a capa que faria você parar." }).waitFor();
  await rec.point(page.locator(".cover-picker header p"), 2500);

  rec.mark("capa");
  await rec.click(page.getByRole("button", { name: "3", exact: true }));
  await rec.click(page.getByRole("button", { name: "Gerar opções de capa" }));
  await idle();
  await rec.wait(1500);

  rec.mark("evitar");
  for (const fig of await page.locator(".cover-options figure img").all()) await rec.point(fig, 1600);

  rec.mark("referencia");
  await rec.click(page.getByRole("button", { name: "Usar esta capa" }).first());
  await rec.wait(1800);

  rec.mark("restante");
  await rec.click(page.getByRole("button", { name: /Gerar restantes|Gerar imagens/ }));
  await idle();

  rec.mark("pico");
  await page.getByText(/Você fez. Agora publique hoje./).waitFor({ timeout: 30000 });
  await rec.wait(5000);
  await rec.point(page.locator(".publish-cards"), 3000);

  rec.mark("correcao");
  await rec.click(page.getByRole("button", { name: /Ajustar os cards/ }));
  await rec.click(page.getByRole("button", { name: /^Slide 2:/ }));
  await rec.click(page.getByRole("button", { name: "Corrigir" }));
  await rec.click(page.getByRole("button", { name: "Título pequeno" }));
  await rec.click(page.getByRole("button", { name: "Corrigir este card" }));
  await idle();
  await rec.wait(1500);

  rec.mark("desatualizado");
  const title = page.locator(".slide-fields textarea").first();
  await rec.click(title);
  await page.keyboard.press("End");
  await title.pressSequentially("!", { delay: 80 });
  await rec.click(page.getByRole("button", { name: "Salvar alterações" }));
  await rec.wait(1200);
  await rec.point(page.locator(".slide-thumb.selected"), 1500);
  await rec.click(page.getByRole("button", { name: /Gerar este slide novamente/ }));
  await idle();
  await rec.wait(1200);

  rec.mark("acao");
  await rec.click(page.getByRole("button", { name: "Pronto para publicar" }));
  await rec.point(page.getByRole("button", { name: "Enviar para o celular" }), 3500);
  await rec.close();
} finally {
  await rec.finish();
}
console.log("aula-05 gravada");

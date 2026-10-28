import { copyFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Recorder, NICHES, cardHtml, emptyOnboarding, nicheProfile } from "./lib.mjs";

// Aula 4 — A + C (interface 0.3): arquitetura e texto com geração real (Doce Ofício).
// O estado final (texto aprovado e as três capas geradas) segue para a aula 5.
const radar = JSON.parse(await readFile(join(NICHES, "confeiteira", "radar.json"), "utf8"));
const rec = await new Recorder("aula-04").init();
try {
  const state = { profile: await nicheProfile("confeiteira", "Doce Ofício"), onboarding: emptyOnboarding(), ideas: [radar], projects: [], settings: { weeklyGoal: 5, driveFolder: "", firstCompletedAt: "", lastReminderAt: new Date().toISOString() } };
  const userData = await rec.userData({ auth: true, state });
  const page = await rec.open(userData);
  await rec.until(async () => (await window.pacto.request("bootstrap")).account?.connected, null, 120000);
  const pick = async (pill, option) => { await rec.click(page.getByRole("button", { name: pill })); await rec.click(page.getByRole("menuitemradio", { name: option })); };
  const project = () => rec.until(async () => { const p = (await window.pacto.request("bootstrap")).projects[0]; return p && !["planning", "generating"].includes(p.status) && p.slides.length > 0; }, null, 900000);

  rec.mark("progresso");
  await rec.type(page.getByLabel("Tema ou ideia"), "Pare de cobrar só os ingredientes. Contar a história de quando eu cobrava só os ingredientes dos bolos e trabalhava de graça. Ensinar os 4 custos que entram no preço: ingredientes, embalagem, energia e o meu tempo.", 10);

  rec.mark("arquitetura");
  await rec.click(page.getByRole("button", { name: /Tipo/ }));
  for (const option of (await page.getByRole("menuitemradio").all()).slice(1)) await rec.point(option, 1200);
  await page.keyboard.press("Escape");

  rec.mark("escolha");
  await pick(/Tipo/, /^História → Método → Oferta/);
  await pick(/Objetivo/, /^Salvamentos/);
  await pick(/Tamanho/, /^4 cards/);
  await rec.click(page.getByRole("button", { name: "Criar carrossel" }));
  await page.getByRole("navigation", { name: "Etapas" }).waitFor();

  rec.mark("texto-primeiro");
  await rec.point(page.locator(".loading"), 1500);
  await project();
  await page.locator(".outline-row").first().waitFor();
  await rec.wait(1500);

  rec.mark("copy");
  const rows = page.locator(".outline-row");
  await rec.point(rows.nth(0), 1800);
  await rec.point(rows.nth(0).locator("p"), 1500);
  await rec.point(rows.nth(3), 2200);

  rec.mark("card2");
  await rec.click(rows.nth(1));
  await rec.point(page.getByRole("textbox", { name: "Título", exact: true }), 1500);
  await rec.point(page.getByRole("textbox", { name: "Texto", exact: true }), 3500);

  rec.image("prova", await rec.card("prova", cardHtml({ eyebrow: "A MESMA PAUTA, COM E SEM MÉTODO", title: "Qual você <em>salvaria?</em>", items: [["✕", "Sem contexto, algo como: “Dicas para precificar seus bolos”"], ["✓", "Com o método: “Pare de cobrar só os ingredientes”"]], letter: "C" })));

  rec.mark("editar");
  await rec.click(rows.nth(0));
  const hooks = page.locator(".hooks button");
  if (await hooks.count()) { await rec.point(hooks.first(), 1000); await rec.click(hooks.nth(Math.min(1, (await hooks.count()) - 1))); await rec.wait(1200); }
  await rec.click(page.getByRole("textbox", { name: "Título", exact: true }));
  await page.keyboard.press("End");
  await rec.wait(1500);
  await rec.click(page.getByRole("button", { name: "Fechar painel" }));

  rec.mark("legenda");
  await rec.point(page.locator(".side .fld > span").filter({ hasText: "Legenda" }).first(), 2500);
  await rec.point(page.getByText("Linha editorial", { exact: true }), 1800);
  await rec.point(page.getByText("Mascote, desenho ou efeito", { exact: true }), 1800);

  rec.mark("revisao");
  for (const box of await page.getByRole("group", { name: /Revisão humana/ }).getByRole("checkbox").all()) await rec.click(box, 150);
  await rec.click(page.getByRole("button", { name: "Aprovar e criar capas" }));

  rec.mark("acao");
  await page.getByRole("heading", { name: "Qual capa faz você parar?" }).waitFor();
  await rec.point(page.getByRole("heading", { name: "Qual capa faz você parar?" }), 2500);
  await rec.point(page.getByRole("navigation", { name: "Etapas" }), 3000);
  // Fora do roteiro: espera as capas terminarem para a aula 5 continuar daqui.
  rec.mark("espera-capas");
  await rec.until(async () => { const s = await window.pacto.request("bootstrap"); const p = s.projects[0]; return p.coverOptions?.length >= 3 && !["planning", "generating"].includes(p.status); }, null, 1500000);
  await rec.wait(1000);
  await rec.close();
  await copyFile(join(userData, "library", "state.json"), join(rec.dir, "estado-final.json"));
} finally {
  await rec.finish();
}
console.log("aula-04 gravada");

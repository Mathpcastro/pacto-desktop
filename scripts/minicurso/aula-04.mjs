import { copyFile, readFile } from "node:fs/promises";
import { join } from "node:path";
import { Recorder, NICHES, cardHtml, emptyOnboarding, nicheProfile } from "./lib.mjs";

// Aula 4 — A + C: arquitetura e texto, com geração real (Doce Ofício). O estado
// final (texto aprovado) é guardado para a aula 5 continuar o mesmo carrossel.
const radar = JSON.parse(await readFile(join(NICHES, "confeiteira", "radar.json"), "utf8"));
const rec = await new Recorder("aula-04").init();
try {
  const state = { profile: await nicheProfile("confeiteira", "Doce Ofício"), onboarding: emptyOnboarding(), ideas: [radar], projects: [], settings: { weeklyGoal: 5, driveFolder: "", firstCompletedAt: "", lastReminderAt: new Date().toISOString() } };
  const userData = await rec.userData({ auth: true, state });
  const page = await rec.open(userData);
  await rec.until(async () => (await window.pacto.request("bootstrap")).account?.connected, null, 120000);

  rec.mark("progresso");
  await rec.click(page.getByRole("button", { name: /Novo carrossel/ }).first());
  await rec.type(page.getByLabel("Nome do carrossel"), "Pare de cobrar só os ingredientes", 25);
  await rec.type(page.getByLabel(/Sobre o que é/), "Contar a história de quando eu cobrava só os ingredientes dos bolos e trabalhava de graça. Ensinar os 4 custos que entram no preço: ingredientes, embalagem, energia e o meu tempo.", 12);

  rec.mark("arquitetura");
  for (const radio of (await page.locator(".architecture-grid button").all()).slice(1)) await rec.point(radio, 1300);

  rec.mark("escolha");
  await rec.click(page.getByRole("radio", { name: /^História → Método → Oferta/ }));
  await rec.click(page.getByRole("radio", { name: "Salvamentos" }));
  await rec.click(page.getByRole("radio", { name: "4 cards" }));
  await rec.click(page.getByRole("button", { name: "Abrir no estúdio" }));
  await rec.wait(1500);

  rec.mark("texto-primeiro");
  await rec.point(page.getByRole("heading", { name: /Primeiro o texto/ }), 1200);
  await rec.click(page.getByRole("button", { name: "Gerar o texto do carrossel" }));
  await rec.until(async () => { const p = (await window.pacto.request("bootstrap")).projects[0]; return p && !["planning", "generating"].includes(p.status) && p.slides.length > 0; }, null, 900000);
  await page.locator(".copy-board").waitFor();
  await rec.wait(1500);

  rec.mark("copy");
  const cards = page.locator(".copy-card");
  await rec.point(cards.nth(0).locator(".copy-title"), 1800);
  await rec.point(cards.nth(0).locator("textarea").nth(1), 1500);
  await cards.nth(3).scrollIntoViewIfNeeded(); await rec.point(cards.nth(3).locator(".copy-title"), 2200);

  rec.mark("card2");
  await cards.nth(1).scrollIntoViewIfNeeded();
  await rec.point(cards.nth(1).locator(".copy-title"), 1500);
  await rec.point(cards.nth(1).locator("textarea").nth(1), 3500);

  rec.image("prova", await rec.card("prova", cardHtml({ eyebrow: "A MESMA PAUTA, COM E SEM MÉTODO", title: "Qual você <em>salvaria?</em>", items: [["✕", "Sem contexto, algo como: “Dicas para precificar seus bolos”"], ["✓", "Com o PACTO: “Pare de cobrar só os ingredientes”"]], letter: "C" })));

  rec.mark("editar");
  await cards.nth(0).scrollIntoViewIfNeeded();
  const hooks = page.locator(".hook-options button");
  if (await hooks.count()) { await rec.point(hooks.first(), 1000); await rec.click(hooks.nth(Math.min(1, (await hooks.count()) - 1))); await rec.wait(1200); }
  await rec.click(cards.nth(0).locator(".copy-title"));
  await page.keyboard.press("End");
  await rec.wait(1500);

  rec.mark("legenda");
  await page.locator(".copy-caption").scrollIntoViewIfNeeded();
  await rec.point(page.locator(".copy-caption textarea"), 2500);
  await page.locator(".copy-direction").scrollIntoViewIfNeeded();
  await rec.point(page.locator(".copy-direction textarea").first(), 1800);
  await rec.point(page.locator(".copy-direction textarea").nth(1), 1800);

  rec.mark("revisao");
  await page.locator(".review-checklist").scrollIntoViewIfNeeded();
  for (const box of await page.locator(".review-checklist input").all()) { await rec.click(box, 150); }
  await rec.click(page.getByRole("button", { name: /Aprovar texto e criar a capa/ }));

  rec.mark("acao");
  await page.getByRole("heading", { name: "Escolha a capa que faria você parar." }).waitFor();
  await rec.point(page.getByRole("heading", { name: "Escolha a capa que faria você parar." }), 2500);
  await rec.point(page.locator(".stage-bar li.current"), 3000);
  await rec.close();
  await copyFile(join(userData, "library", "state.json"), join(rec.dir, "estado-final.json"));
} finally {
  await rec.finish();
}
console.log("aula-04 gravada");

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Recorder, NICHES, cardHtml, emptyOnboarding, nicheProfile } from "./lib.mjs";

// Aula 3 — P · Pauta: Radar e Modelador ao vivo (Prado Advocacia Trabalhista).
const radar = JSON.parse(await readFile(join(NICHES, "advogada", "radar.json"), "utf8"));
const rec = await new Recorder("aula-03").init();
try {
  const state = { profile: await nicheProfile("advogada", "Prado Advocacia Trabalhista"), onboarding: emptyOnboarding(), ideas: [radar], projects: [], settings: { weeklyGoal: 5, driveFolder: "", firstCompletedAt: "", lastReminderAt: new Date().toISOString() } };
  const page = await rec.open(await rec.userData({ auth: true, state }));
  await rec.until(async () => (await window.pacto.request("bootstrap")).account?.connected, null, 120000);
  const nav = (name) => page.locator(".main-nav button", { hasText: name });

  rec.mark("progresso");
  await rec.wait(800);
  await rec.point(page.getByRole("heading", { name: "Comece por uma destas pautas." }), 1500);
  for (const card of (await page.locator(".opportunities .idea-card").all()).slice(0, 3)) await rec.point(card, 700);

  rec.image("fontes", await rec.card("fontes", cardHtml({ eyebrow: "AULA 02 · AS 4 FONTES DE PAUTA", title: "De onde vêm <em>as ideias.</em>", items: [["1", "Modelar referências que funcionaram"], ["2", "Tendências e assuntos do momento"], ["3", "O seu próprio conteúdo"], ["4", "Pesquisa com IA"]], letter: "P" })));

  rec.mark("outras-fontes");
  await rec.click(page.getByRole("button", { name: /Novo carrossel/ }).first());
  await rec.type(page.getByLabel("Nome do carrossel"), "Pergunta de cliente: posso ser demitida grávida?", 18);
  await rec.type(page.getByLabel(/Sobre o que é/), "Uma cliente perguntou se pode ser demitida durante a gravidez. Explicar a estabilidade da gestante de forma simples.", 14);
  await rec.wait(1500);
  await rec.click(page.getByRole("button", { name: "Cancelar" }));

  rec.mark("radar");
  await rec.click(nav("Pautas"));
  await rec.type(page.getByLabel(/Foco desta rodada/), "dúvidas de quem acabou de ser demitido", 30);
  await rec.click(page.getByRole("button", { name: "Gerar 30 pautas" }));
  await rec.until(async () => { const s = await window.pacto.request("bootstrap"); return !s.working && s.ideas.length >= 2; }, null);
  await rec.wait(1500);
  await page.locator(".idea-batch").first().scrollIntoViewIfNeeded();
  await rec.wait(1500);

  rec.mark("utilidade");
  await rec.click(page.getByRole("checkbox", { name: /Top 10/ }));
  for (const card of (await page.locator(".idea-batch").first().locator(".idea-card").all()).slice(0, 4)) await rec.point(card, 900);

  rec.mark("criterio");
  await rec.point(page.locator(".idea-batch").first().locator(".idea-card dt").first(), 3500);
  await rec.wait(2000);

  rec.mark("modelador");
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: "smooth" }));
  await rec.wait(800);
  await rec.click(page.getByRole("tab", { name: "Modelador de Referências" }));
  await rec.type(page.getByLabel("Referência que performou bem"), "Carrossel de uma advogada: '5 coisas que o RH não te conta na demissão'. Muitos salvamentos e comentários pedindo a lista completa.", 12);
  await rec.click(page.getByRole("button", { name: "Modelar sem copiar" }));
  await rec.until(async () => { const s = await window.pacto.request("bootstrap"); return !s.working && s.ideas.some((b) => b.source === "modelador"); }, null);
  await rec.wait(1200);
  await page.locator(".idea-batch").first().scrollIntoViewIfNeeded();
  await rec.point(page.locator(".idea-batch").first().locator("header p").first(), 3500);
  await rec.point(page.locator(".idea-batch").first().locator(".idea-card").first(), 1500);

  rec.mark("acao");
  await rec.click(page.locator(".idea-batch").first().locator(".idea-card").first().getByRole("button", { name: /Criar carrossel/ }));
  await rec.point(page.getByLabel("Nome do carrossel"), 2500);
  await rec.point(page.getByRole("button", { name: "Abrir no estúdio" }), 2500);
  await rec.close();
} finally {
  await rec.finish();
}
console.log("aula-03 gravada");

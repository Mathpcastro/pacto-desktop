import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Recorder, NICHES, cardHtml, emptyOnboarding, nicheProfile } from "./lib.mjs";

// Aula 3 — P · Pauta (interface 0.3): Radar e Modelador ao vivo (Prado Advocacia Trabalhista).
const radar = JSON.parse(await readFile(join(NICHES, "advogada", "radar.json"), "utf8"));
const rec = await new Recorder("aula-03").init();
try {
  const state = { profile: await nicheProfile("advogada", "Prado Advocacia Trabalhista"), onboarding: emptyOnboarding(), ideas: [radar], projects: [], settings: { weeklyGoal: 5, driveFolder: "", firstCompletedAt: "", lastReminderAt: new Date().toISOString() } };
  const page = await rec.open(await rec.userData({ auth: true, state }));
  await rec.until(async () => (await window.pacto.request("bootstrap")).account?.connected, null, 120000);
  const tab = (name) => page.getByRole("tab", { name });

  rec.mark("progresso");
  await rec.wait(800);
  await rec.point(page.getByRole("region", { name: "Ideias" }), 1300);
  for (const idea of (await page.locator(".idea").all()).slice(0, 3)) await rec.point(idea, 700);

  rec.image("fontes", await rec.card("fontes", cardHtml({ eyebrow: "AULA 02 · AS 4 FONTES DE PAUTA", title: "De onde vêm <em>as ideias.</em>", items: [["1", "Modelar referências que funcionaram"], ["2", "Tendências e assuntos do momento"], ["3", "O seu próprio conteúdo"], ["4", "Pesquisa com IA"]], letter: "P" })));

  rec.mark("outras-fontes");
  await rec.type(page.getByLabel("Tema ou ideia"), "Uma cliente perguntou se pode ser demitida durante a gravidez. Explicar a estabilidade da gestante de forma simples.", 14);
  await rec.wait(1500);
  await page.getByLabel("Tema ou ideia").fill("");

  rec.mark("radar");
  await rec.click(page.getByRole("button", { name: "Gerar pautas" }));
  await rec.type(page.getByLabel(/Foco desta rodada/), "dúvidas de quem acabou de ser demitido", 30);
  const before = (await page.evaluate(() => window.pacto.request("bootstrap"))).ideas.length;
  await rec.click(page.getByRole("button", { name: "Gerar 30 pautas" }));
  await rec.until(async (before) => { const s = await window.pacto.request("bootstrap"); return !s.working && s.ideas.length > before; }, before);
  await rec.wait(1500);

  rec.mark("utilidade");
  for (const idea of (await page.locator(".idea").all()).slice(0, 4)) await rec.point(idea, 900);

  rec.mark("criterio");
  await rec.click(page.locator(".idea").first().locator(".title"));
  await rec.point(page.locator(".idea-more b").first(), 3500);
  await rec.wait(1500);

  rec.mark("modelador");
  await rec.click(tab("Referências"));
  await rec.click(page.getByRole("button", { name: "Modelar referência" }).first());
  await rec.type(page.getByLabel("Referência que performou bem"), "Carrossel de uma advogada: '5 coisas que o RH não te conta na demissão'. Muitos salvamentos e comentários pedindo a lista completa.", 12);
  await rec.click(page.getByRole("button", { name: "Modelar sem copiar" }));
  await rec.until(async () => { const s = await window.pacto.request("bootstrap"); return !s.working && s.ideas.some((b) => b.source === "modelador"); }, null);
  await rec.wait(1200);
  for (const idea of (await page.locator(".idea").all()).slice(0, 3)) await rec.point(idea, 800);

  rec.mark("acao");
  await rec.click(page.locator(".idea").first().getByRole("button", { name: "Usar" }));
  await rec.point(page.getByLabel("Tema ou ideia"), 2500);
  await rec.point(page.getByRole("button", { name: "Criar carrossel" }), 2500);
  await rec.close();
} finally {
  await rec.finish();
}
console.log("aula-03 gravada");

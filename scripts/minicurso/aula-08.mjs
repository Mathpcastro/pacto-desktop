import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Recorder, NICHES, cardHtml, emptyOnboarding, nicheProfile, nicheProject } from "./lib.mjs";

// Aula 8 — O curso é opcional, e vale a pena (interface 0.3): as aulas no menu da conta e tocando no app.
const rec = await new Recorder("aula-08").init();
try {
  const state = { profile: await nicheProfile("confeiteira", "Doce Ofício"), onboarding: emptyOnboarding(), ideas: [JSON.parse(await readFile(join(NICHES, "confeiteira", "radar.json"), "utf8"))], settings: { weeklyGoal: 5, driveFolder: "", firstCompletedAt: new Date().toISOString(), lastReminderAt: new Date().toISOString() }, projects: [await nicheProject("confeiteira")] };
  const page = await rec.open(await rec.userData({ auth: true, state }));
  await rec.until(async () => (await window.pacto.request("bootstrap")).account?.connected, null, 120000);

  rec.mark("opcional");
  await rec.click(page.locator(".avatar-btn"));
  await rec.click(page.getByRole("button", { name: /Aulas do método/ }));
  for (const item of (await page.locator(".course-cols > div").first().locator("button").all()).slice(0, 8)) await rec.point(item, 500);

  rec.mark("porque");
  await rec.click(page.locator(".course-cols > div").nth(1).locator("button", { hasText: /Copy/ }).first());
  await page.locator(".lesson-frame iframe").waitFor();
  await rec.wait(4000);
  await rec.point(page.locator(".lesson-marks"), 3000);

  rec.image("extras", await rec.card("extras", cardHtml({ eyebrow: "MATERIAIS DO CURSO", title: "Para consultar <em>quando quiser.</em>", items: [["1", "Swipe File de ganchos e chamadas"], ["2", "Anatomia dos carrosséis vencedores"], ["3", "Replicação de vencedores"], ["4", "Desafio: primeiro carrossel em 30 minutos"]] })));

  rec.mark("como");
  await rec.click(page.getByRole("button", { name: "Voltar ao estúdio" }));
  await rec.click(page.locator(".lib-open").first());
  await rec.click(page.getByRole("navigation", { name: "Etapas" }).getByRole("button", { name: "Texto" }));
  await rec.click(page.getByRole("button", { name: /Ver esta etapa na aula/ }));
  await page.locator(".lesson-frame iframe").waitFor();
  await rec.wait(5000);
  await rec.click(page.getByRole("button", { name: "Voltar ao estúdio" }));
  rec.image("fim", await rec.card("fim-curso", cardHtml({ eyebrow: "PACTO EM 19 MINUTOS", title: "Você tem o método <em>e a ferramenta.</em>", subtitle: "Abra o Carrossell, escolha uma ideia e publique o seu próximo carrossel." })));
  await rec.close();
} finally {
  await rec.finish();
}
console.log("aula-08 gravada");

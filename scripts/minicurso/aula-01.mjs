import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ROOT, Recorder, NICHES, cardHtml, emptyOnboarding, nicheProfile, nicheProject } from "./lib.mjs";

// Aula 1 — Do zero ao carrossel (interface 0.3). Beats: resultado, atalho, letras, mapa, filosofia, conta, acao.
const rec = await new Recorder("aula-01").init();
try {
  // resultado: o carrossel nascendo no app 0.3, da gravação real do vídeo de venda (texto → capa → cards → publicar).
  const take = join(ROOT, ".cache", "minicurso", "carrossel-video-030", "take-1.mp4");
  rec.clip("resultado", take, [[82, 92], [135, 146], [167, 177], [305, 318]]);

  const radar = JSON.parse(await readFile(join(NICHES, "confeiteira", "radar.json"), "utf8"));
  const state = {
    profile: await nicheProfile("confeiteira", "Doce Ofício"),
    onboarding: emptyOnboarding(),
    ideas: [radar],
    settings: { weeklyGoal: 5, driveFolder: "", firstCompletedAt: new Date().toISOString(), lastReminderAt: new Date().toISOString() },
    projects: await Promise.all(["moda-fitness", "confeiteira", "saas", "advogada"].map((slug) => nicheProject(slug))),
  };
  const page = await rec.open(await rec.userData({ auth: true, state }));
  await rec.until(async () => (await window.pacto.request("bootstrap")).account?.connected, null, 120000);

  rec.mark("atalho");
  await rec.wait(1200);
  await rec.point(page.locator(".brandmark"), 800);
  await rec.point(page.getByRole("heading", { name: "O que vamos publicar hoje?" }), 1200);
  await rec.point(page.getByRole("button", { name: /Formato/ }), 700);
  await rec.point(page.locator(".idea").first(), 1500);
  await rec.point(page.locator(".lib-item").first(), 1500);

  // Cartelas das cinco letras e do mapa do minicurso.
  rec.image("letras", await rec.card("letras", cardHtml({ eyebrow: "O MÉTODO", title: "Cinco letras, <em>um carrossel.</em>", items: [["P", "Pauta<br>o que postar"], ["A", "Arquitetura<br>a sequência"], ["C", "Copy<br>texto que soa como gente"], ["T", "Tratamento visual<br>sua identidade"], ["O", "Oferta<br>do comentário à venda"]] })));
  rec.image("mapa", await rec.card("mapa", cardHtml({ eyebrow: "O MINICURSO", title: "Oito aulas, <em>um post publicado.</em>", items: [["1", "Do zero ao carrossel"], ["2", "Fundação: contexto e Design Kit"], ["3", "P · Pauta"], ["4", "A + C · Arquitetura e copy"], ["5", "T · Tratamento visual"], ["6", "O · Oferta e rotina"], ["7", "Quando algo sai errado"], ["8", "O curso, se quiser ir além"]] }).replace("repeat(5,1fr)", "repeat(4,1fr)")));

  rec.mark("filosofia");
  await page.locator(".lib-grid").scrollIntoViewIfNeeded();
  for (const card of await page.locator(".lib-item").all()) await rec.point(card, 1100);
  await rec.click(page.getByRole("button", { name: /^Abrir Seu bolo custa mais/ }).first());
  await rec.wait(4000);
  await rec.click(page.getByRole("button", { name: "Voltar ao início" }));
  await rec.point(page.locator(".week"), 2500);
  await rec.close();

  // conta: primeira abertura de quem acabou de instalar; o login já existe e conecta sozinho.
  const fresh = await rec.open(await rec.userData({ auth: true, state: { profile: null, projects: [], ideas: [], onboarding: emptyOnboarding() } }));
  rec.mark("conta");
  await rec.point(fresh.getByRole("heading", { name: /Conecte sua conta do ChatGPT/ }), 1200);
  await rec.until(async () => (await window.pacto.request("bootstrap")).account?.connected, null, 120000);
  await rec.wait(1200);
  await rec.point(fresh.locator(".account-card"), 3000);
  await rec.click(fresh.locator(".avatar-btn"));
  await rec.wait(2500);
  await fresh.keyboard.press("Escape");

  rec.mark("acao");
  await rec.point(fresh.getByRole("button", { name: "Continuar" }), 3000);
  await rec.wait(2500);
  await rec.close();
} finally {
  await rec.finish();
}
console.log("aula-01 gravada");

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Recorder, NICHES, cardHtml, emptyOnboarding, nicheProfile, nicheProject } from "./lib.mjs";

// Aula 6 — O: CTA/DM e stories ao vivo, QR code real, Ritmo e Replicador (Agendei).
// Os resultados dos outros carrosséis são números de exemplo para mostrar o painel.
const day = 864e5, ago = (d) => new Date(Date.now() - d * day).toISOString();
const rec = await new Recorder("aula-06").init();
try {
  const state = {
    profile: await nicheProfile("saas", "Agendei"), onboarding: emptyOnboarding(),
    ideas: [JSON.parse(await readFile(join(NICHES, "saas", "radar.json"), "utf8"))],
    settings: { weeklyGoal: 5, driveFolder: "", firstCompletedAt: ago(10), lastReminderAt: ago(0) },
    projects: [
      await nicheProject("saas", { ctaKit: null, stories: [] }),
      await nicheProject("advogada", { publishedAt: ago(6), results: { comments: 48, saves: 156, sales: 3, recordedAt: ago(3) } }),
      await nicheProject("moda-fitness", { publishedAt: ago(8), results: { comments: 9, saves: 22, sales: 0, recordedAt: ago(5) } }),
      await nicheProject("confeiteira", { publishedAt: ago(3) }),
    ],
  };
  const page = await rec.open(await rec.userData({ auth: true, state }));
  await rec.until(async () => (await window.pacto.request("bootstrap")).account?.connected, null, 120000);
  const nav = (name) => page.locator(".main-nav button", { hasText: name });

  rec.mark("progresso");
  await rec.click(page.getByRole("button", { name: /^Abrir 6 dados/ }));
  await rec.wait(2500);

  rec.image("fluxo", await rec.card("fluxo", cardHtml({ eyebrow: "AULA 07 · O CARROSSEL NÃO TERMINA NO ÚLTIMO CARD", title: "Do comentário <em>à venda.</em>", items: [["1", "Carrossel"], ["2", "Pedido de comentário"], ["3", "Conversa na DM"], ["4", "Entrega do material"], ["5", "Oferta"]], letter: "O" })));

  rec.mark("cta");
  await rec.click(page.getByRole("button", { name: /Gerar CTA, DM e oferta/ }));
  await rec.click(page.getByRole("button", { name: "Gerar estratégia" }));
  await rec.until(async () => Boolean((await window.pacto.request("bootstrap")).projects.find((p) => p.id === "p-saas").ctaKit), null);
  await rec.wait(1200);
  await rec.point(page.locator(".cta-item").nth(3), 2000);
  await rec.point(page.locator(".cta-item").nth(4), 2500);

  rec.mark("palavra");
  await page.locator(".cta-kit .architecture-chips").scrollIntoViewIfNeeded();
  await rec.point(page.locator(".cta-kit .architecture-chips span").first(), 2500);
  await rec.click(page.getByRole("button", { name: "Fechar", exact: true }));

  rec.mark("stories");
  await rec.click(page.getByRole("button", { name: /Stories de perguntas/ }));
  await rec.click(page.getByRole("button", { name: "Criar stories" }));
  await rec.until(async () => ((await window.pacto.request("bootstrap")).projects.find((p) => p.id === "p-saas").stories || []).length > 0, null);
  await rec.wait(1000);
  for (const item of (await page.locator(".story-item").all()).slice(0, 3)) await rec.point(item, 1000);
  await rec.click(page.getByRole("button", { name: "Fechar", exact: true }));

  rec.mark("celular");
  await rec.click(page.getByRole("button", { name: "Enviar para o celular" }));
  await page.locator(".share-qr").waitFor({ timeout: 20000 });
  await rec.point(page.locator(".share-qr"), 2500);
  await rec.point(page.locator(".share-steps"), 2000);
  await rec.click(page.getByRole("button", { name: "Concluir" }));
  await rec.click(page.getByRole("button", { name: /Copiar legenda/ }));
  await rec.wait(1200);
  const copied = await rec.app.evaluate(({ clipboard }) => clipboard.readText());
  console.log(JSON.stringify({ clipboardHasCaption: copied.length > 20 }));

  rec.mark("ritmo");
  await rec.click(page.getByRole("button", { name: /Marquei como publicado/ }));
  await rec.wait(1200);
  await rec.click(page.getByRole("button", { name: "Voltar para a biblioteca" }));
  await rec.click(nav("Ritmo"));
  await rec.wait(1200);
  await rec.point(page.locator(".rhythm-goal"), 2000);
  await rec.click(page.getByRole("button", { name: "Aumentar meta" }));
  await rec.point(page.locator(".pending-list li").first(), 2000);

  rec.mark("metricas");
  await page.locator(".winners").scrollIntoViewIfNeeded();
  await rec.point(page.locator(".winners th").nth(2), 1300);
  await rec.point(page.locator(".winners th").nth(1), 1300);
  await rec.point(page.locator(".winners th").nth(3), 1300);
  await rec.point(page.locator(".winners tr.above .idea-badge").first(), 2500);

  rec.mark("replicar");
  await rec.click(page.locator(".winners tr.above").first().getByRole("button", { name: "Replicar" }));
  await rec.click(page.getByRole("button", { name: /Salvar e replicar/ }));
  await rec.until(async () => { const s = await window.pacto.request("bootstrap"); return !s.working && s.ideas.some((b) => b.source === "replicador"); }, null);
  await rec.wait(1500);
  await rec.point(page.locator(".idea-batch").first().locator("header h2"), 1500);
  for (const card of (await page.locator(".idea-batch").first().locator(".idea-card").all()).slice(0, 3)) await rec.point(card, 700);

  rec.mark("acao");
  await rec.click(nav("Biblioteca"));
  await rec.click(page.getByRole("button", { name: /^Abrir 6 dados/ }));
  await rec.point(page.getByRole("button", { name: "Enviar para o celular" }), 3500);
  await rec.close();
} finally {
  await rec.finish();
}
console.log("aula-06 gravada");

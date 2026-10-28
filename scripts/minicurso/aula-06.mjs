import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Recorder, NICHES, cardHtml, emptyOnboarding, nicheProfile, nicheProject } from "./lib.mjs";

// Aula 6 — O (interface 0.3): CTA/DM e stories ao vivo, QR code real, meta da semana e Replicador (Agendei).
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
  const tab = (name) => page.getByRole("tab", { name });
  const saas = () => page.evaluate(async () => (await window.pacto.request("bootstrap")).projects.find((p) => p.id === "p-saas"));

  rec.mark("progresso");
  await rec.click(page.getByRole("button", { name: /^Abrir 6 dados/ }));
  await page.getByLabel("Prévia no Instagram").waitFor();
  await rec.wait(2500);

  rec.image("fluxo", await rec.card("fluxo", cardHtml({ eyebrow: "AULA 07 · O CARROSSEL NÃO TERMINA NO ÚLTIMO CARD", title: "Do comentário <em>à venda.</em>", items: [["1", "Carrossel"], ["2", "Pedido de comentário"], ["3", "Conversa na DM"], ["4", "Entrega do material"], ["5", "Oferta"]], letter: "O" })));

  rec.mark("cta");
  await rec.click(tab("Comentário e DM"));
  await rec.click(page.getByRole("button", { name: /Gerar palavras-chave/ }));
  await rec.until(async () => Boolean((await window.pacto.request("bootstrap")).projects.find((p) => p.id === "p-saas").ctaKit), null);
  await rec.wait(1200);
  await rec.point(page.getByText("DM 1 · entrega"), 2000);
  await rec.point(page.getByText("DM 2 · ponte para a oferta"), 2500);

  rec.mark("palavra");
  await page.locator(".kw").scrollIntoViewIfNeeded();
  await rec.point(page.locator(".kw span").first(), 2500);

  rec.mark("stories");
  await rec.click(tab("Stories"));
  await rec.click(page.getByRole("button", { name: /Criar stories/ }));
  await rec.until(async () => ((await window.pacto.request("bootstrap")).projects.find((p) => p.id === "p-saas").stories || []).length > 0, null);
  await rec.wait(1000);
  for (const item of (await page.locator(".story").all()).slice(0, 3)) await rec.point(item, 1000);

  rec.mark("celular");
  await rec.click(tab("Enviar"));
  await rec.click(page.getByRole("button", { name: "Enviar para o celular" }));
  await page.locator(".qr img").waitFor({ timeout: 20000 });
  await rec.point(page.locator(".qr img"), 2500);
  await rec.point(page.locator(".qr ol"), 2000);
  await rec.click(page.locator(".box").filter({ hasText: "Legenda" }).getByRole("button", { name: "Copiar" }));
  await rec.wait(1200);
  const copied = await rec.app.evaluate(({ clipboard }) => clipboard.readText());
  console.log(JSON.stringify({ clipboardHasCaption: copied.length > 20, caption: (await saas()).caption.length }));

  rec.mark("ritmo");
  await rec.click(page.getByRole("button", { name: "Marquei como publicado" }));
  await rec.wait(1200);
  await rec.click(page.getByRole("button", { name: "Voltar ao início" }));
  await rec.wait(800);
  await rec.point(page.locator(".week-top"), 2000);
  await rec.click(page.getByRole("button", { name: "Aumentar meta" }));
  await rec.point(page.locator(".pending-item").first(), 2000);

  rec.mark("metricas");
  await page.locator(".winners").scrollIntoViewIfNeeded();
  for (const w of await page.locator(".winner").all()) await rec.point(w, 1300);

  rec.mark("replicar");
  await rec.click(page.locator(".winner").first().getByRole("button", { name: "Replicar" }));
  await rec.until(async () => { const s = await window.pacto.request("bootstrap"); return !s.working && s.ideas.some((b) => b.source === "replicador"); }, null);
  await rec.wait(1500);
  for (const idea of (await page.locator(".idea").all()).slice(0, 4)) await rec.point(idea, 700);

  rec.mark("acao");
  await rec.click(page.getByRole("button", { name: /^Abrir 6 dados/ }));
  await rec.point(page.getByRole("button", { name: "Enviar para o celular" }), 3500);
  await rec.close();
} finally {
  await rec.finish();
}
console.log("aula-06 gravada");

import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Recorder, NICHES, emptyOnboarding, nicheProfile, nicheProject, dataUrl } from "./lib.mjs";

// Gravação real do Carrossell 0.3.0 para o carrossel em vídeo de venda do app.
// Exemplo Agendei (SaaS de agendamento). Fotos da cena e cards prontos vêm das provas
// reais anteriores; texto, CTA/DM e o material em PDF são gerados ao vivo pela conta.
// Métricas da meta e dos vencedores são de exemplo e aparecem marcadas como tal no vídeo.
const rec = await new Recorder("carrossel-video-030").init();
const mark = rec.mark.bind(rec);
rec.mark = (id) => { mark(id); console.log(`MARK ${id}`); };
const ago = (d) => new Date(Date.now() - d * 864e5).toISOString();
const series = join(rec.dir, "..", "..", "scene-series-proof");
const photos = await Promise.all([1, 2, 3, 4].map((i) => dataUrl(join(series, `foto-${i}.png`))));
const pending = await nicheProject("saas", { publishedAt: ago(4) });
const winner = structuredClone(pending);
winner.id = "p-winner-demo";
winner.title = "Exemplo · O lembrete que ninguém ignora";
winner.publishedAt = ago(9);
winner.results = { comments: 38, saves: 121, sales: 2, recordedAt: ago(6) };
const other = structuredClone(pending);
other.id = "p-other-demo";
other.title = "Exemplo · Horário vago não é prejuízo fixo";
other.publishedAt = ago(8);
other.results = { comments: 6, saves: 19, sales: 0, recordedAt: ago(5) };
const state = {
  profile: await nicheProfile("saas", "Agendei"),
  onboarding: emptyOnboarding(),
  ideas: [JSON.parse(await readFile(join(NICHES, "saas", "radar.json"), "utf8"))],
  projects: [pending, winner, other],
  media: {
    displayName: "Agendei", handle: "agendei.app", verified: true, avatar: "", faces: [],
    scenes: [{ id: "scene-recepcao", label: "Recepção da clínica pela manhã", prompt: "Balcão de recepção de uma pequena clínica de estética, agenda de papel, café, plantas e luz natural.", status: "approved", image: photos[0], images: photos }],
  },
  settings: { weeklyGoal: 5, driveFolder: "", firstCompletedAt: ago(10), lastReminderAt: ago(0) },
};
const evidence = { realInference: [], metricValuesAreExamples: true };
try {
  const page = await rec.open(await rec.userData({ auth: true, state }));
  page.setDefaultTimeout(15000);
  await rec.until(async () => Boolean((await window.pacto.request("bootstrap")).account?.connected), null, 120000);
  const click = (loc, pause) => rec.click(loc, pause);
  const fresh = () => page.evaluate(() => window.pacto.request("bootstrap"));
  const idle = (id, timeout = 900000) => rec.until(async (id) => { const s = await window.pacto.request("bootstrap"); const p = s.projects.find((x) => x.id === id); return p && !["planning", "generating"].includes(p.status) && !s.working; }, id, timeout);
  const steps = page.getByRole("navigation", { name: "Etapas" });

  rec.mark("inicio");
  await rec.wait(1200);
  await rec.point(page.getByRole("heading", { name: "O que vamos publicar hoje?" }), 900);
  await rec.point(page.getByRole("button", { name: /Formato/ }), 600);
  await rec.point(page.getByRole("button", { name: /Estilo/ }), 600);
  await rec.point(page.locator(".week"), 1200);

  rec.mark("radar");
  await rec.point(page.getByRole("tab", { name: "Radar" }), 500);
  const ideas = page.locator(".idea");
  await click(ideas.nth(0).locator(".title"));
  await rec.wait(1600);
  await rec.point(ideas.nth(1), 600);
  await rec.point(ideas.nth(2), 600);
  await click(ideas.nth(0).getByRole("button", { name: "Usar" }));
  await rec.wait(900);

  rec.mark("criar");
  await click(page.getByRole("button", { name: /Estilo/ }));
  await click(page.getByRole("menuitemradio", { name: /^Texto \+ foto/ }));
  await click(page.getByRole("button", { name: /Tamanho/ }));
  await click(page.getByRole("menuitemradio", { name: /^4 cards/ }));
  await click(page.getByRole("button", { name: "Criar carrossel" }));
  rec.mark("texto-espera");
  await steps.waitFor();
  const id = (await fresh()).projects.find((p) => !["p-saas", "p-winner-demo", "p-other-demo"].includes(p.id)).id;
  await idle(id);
  evidence.realInference.push("texto do carrossel");
  rec.mark("texto");
  await rec.wait(1200);
  for (const row of (await page.locator(".outline-row").all()).slice(0, 3)) await rec.point(row, 500);
  await click(page.locator(".outline-row").nth(1));
  await rec.point(page.getByRole("textbox", { name: "Título", exact: true }), 900);
  await click(page.getByRole("button", { name: "Fechar painel" }));
  for (const box of await page.getByRole("group", { name: /Revisão humana/ }).getByRole("checkbox").all()) await click(box, 120);
  rec.mark("aprovar");
  await click(page.getByRole("button", { name: "Aprovar e criar capas" }));
  await page.locator(".cover-opt").nth(2).waitFor({ timeout: 60000 });
  rec.mark("capas");
  await rec.wait(900);
  await click(page.locator(".cover-opt").nth(1));
  await click(page.getByRole("button", { name: "Usar esta capa" }));
  await page.getByRole("button", { name: "Ir para publicar" }).waitFor({ timeout: 60000 });
  rec.mark("cards");
  await rec.wait(800);
  for (const n of [1, 2, 3]) { await click(page.locator(".thumb").nth(n)); await rec.wait(500); }
  rec.mark("estilos");
  for (const style of ["Tweet", "Texto preto", "Texto + foto"]) {
    await click(page.getByRole("group", { name: "Estilo do carrossel" }).getByRole("button", { name: style }));
    await page.locator(".cover-opt").nth(2).waitFor({ timeout: 60000 });
    await rec.wait(500);
    await click(page.getByRole("button", { name: "Usar esta capa" }));
    await page.getByRole("button", { name: "Ir para publicar" }).waitFor({ timeout: 60000 });
    await rec.wait(1300);
  }
  rec.mark("publicar");
  await click(page.getByRole("button", { name: "Ir para publicar" }));
  await rec.wait(800);
  await click(page.getByRole("button", { name: "Próximo card" }));
  await click(page.getByRole("button", { name: "Próximo card" }));
  await click(page.getByRole("button", { name: "Enviar para o celular" }));
  await page.locator(".qr img").waitFor({ timeout: 20000 }).catch(() => {});
  await rec.wait(2200);

  rec.mark("dm-espera");
  await click(page.getByRole("tab", { name: "Comentário e DM" }));
  await click(page.getByRole("button", { name: /Gerar palavras-chave/ }));
  await idle(id);
  await page.getByText("DM 1 · entrega").waitFor({ timeout: 600000 });
  evidence.realInference.push("CTA, palavras-chave e DMs");
  rec.mark("dm");
  await rec.wait(800);
  await rec.point(page.locator(".kw"), 900);
  await rec.point(page.getByText("DM 1 · entrega"), 1200);
  await click(page.getByRole("button", { name: "Criar PDF com a sua marca" }));
  rec.mark("pdf-espera");
  await steps.getByRole("button", { name: "Roteiro" }).waitFor();
  const material = (await fresh()).projects.find((p) => p.format === "material").id;
  await idle(material);
  evidence.realInference.push("roteiro do material em PDF");
  rec.mark("pdf");
  await rec.wait(800);
  for (const row of (await page.locator(".outline-row").all()).slice(0, 3)) await rec.point(row, 300);
  await click(page.getByRole("button", { name: "Aprovar roteiro" }));
  await page.locator(".cover-opt").nth(2).waitFor({ timeout: 60000 });
  await rec.wait(600);
  await click(page.getByRole("button", { name: "Usar esta capa" }));
  await page.locator(".stage-frame.a4").waitFor({ timeout: 30000 });
  await rec.wait(700);
  for (const n of [1, 2, 3]) { await click(page.locator(".thumb").nth(n)); await rec.wait(450); }
  await click(page.getByRole("button", { name: "Ir para exportar" }));
  await rec.wait(1600);

  rec.mark("ritmo");
  await click(page.getByRole("button", { name: "Voltar ao início" }));
  await rec.wait(800);
  await rec.point(page.locator(".week"), 700);
  await click(page.locator(".week").getByRole("button", { name: "Registrar" }).first());
  for (const [label, value] of [["Comentários", "24"], ["Salvamentos", "87"], ["Vendas", "1"]]) await rec.type(page.locator(".week").getByLabel(label), value, 90);
  await click(page.getByRole("button", { name: "Salvar resultado" }));
  await rec.wait(1000);
  await rec.point(page.locator(".winners"), 1400);

  rec.mark("marca");
  await click(page.getByRole("button", { name: "Marca", exact: true }));
  await rec.wait(900);
  await rec.point(page.locator(".swatches"), 900);
  await page.locator(".scene-grid").scrollIntoViewIfNeeded();
  await rec.point(page.locator(".scene").first(), 1600);
  rec.mark("fim");
  await rec.wait(600);
  console.log(JSON.stringify(evidence));
} finally {
  await rec.finish();
}

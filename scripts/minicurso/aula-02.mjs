import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Recorder, cardHtml, emptyOnboarding } from "./lib.mjs";

// Aula 2 — Fundação: entrevista real do Contexto Oficial da Marca e do Design Kit (Vibra Fit).
const brand = [
  "Somos a Vibra Fit, loja online de roupas fitness femininas: leggings, tops e conjuntos com tecido que não fica transparente no agachamento. Vendemos pelo site e pelo Instagram, peças de R$ 89 a R$ 189.",
  "Público: mulheres de 20 a 40 anos que treinam em academia ou correm. Dores: legging transparente, cós que desce no treino, tecido que esquenta. Desejo: treinar confiante e confortável. Diferencial: teste de agachamento em todas as peças e tabela de medidas detalhada.",
  "Posso entregar grátis um guia de medidas e um checklist de como lavar roupa fitness. Tom próximo e energético, de amiga que treina junto. Limites: nada de emagrecimento, corpo ideal ou antes e depois de corpo.",
];
const design = [
  "Cores da marca: preto, off-white e laranja vibrante (#FF6A2B). Visual creator, com fotos de peças misturadas a rabiscos, setas e anotações à mão, como o feed de uma amiga. Pode ter ilustração das peças em estilo fashion sketch.",
  "Evitar corpos idealizados, foco em emagrecimento e visual de catálogo frio. Títulos fortes, sempre na horizontal. Capa com uma peça em destaque e anotações em volta.",
];
const rec = await new Recorder("aula-02").init();
try {
  const page = await rec.open(await rec.userData({ auth: true, state: { profile: null, projects: [], ideas: [], onboarding: emptyOnboarding() } }));
  await rec.until(async () => (await window.pacto.request("bootstrap")).account?.connected, null, 120000);
  const state = () => page.evaluate(() => window.pacto.request("bootstrap"));
  const turn = (kind, count) => rec.until(async ({ kind, count }) => { const s = await window.pacto.request("bootstrap"); return !s.interviewing && (s.onboarding[kind].messages.filter((m) => m.role === "assistant").length >= count || s.onboarding[kind].document); }, { kind, count });
  const answer = async (text) => { await rec.type(page.getByLabel("Sua resposta"), text, 12); await rec.click(page.getByRole("button", { name: "Enviar resposta" })); };

  rec.mark("progresso");
  await rec.point(page.locator(".step-list li").first(), 1500);
  await rec.click(page.getByRole("button", { name: "Continuar" }));
  await rec.wait(1500);

  rec.mark("porque");
  await rec.point(page.getByRole("heading", { name: "Contexto Oficial da Marca" }), 1500);
  await rec.point(page.locator(".form-heading p"), 2500);

  rec.mark("entrevista");
  await rec.click(page.getByRole("button", { name: /Começar entrevista/ }));
  await turn("brand", 1);
  await rec.wait(1500);
  await answer(brand[0]);
  await turn("brand", 2);
  await rec.wait(1000);

  rec.image("boa-resposta", await rec.card("boa-resposta", cardHtml({ eyebrow: "DICA DA ENTREVISTA", title: "Troque o geral <em>pelo específico.</em>", items: [["✕", "“Vendo roupa fitness.”"], ["✓", "“Leggings que não ficam transparentes no agachamento, pra mulheres que já desistiram de duas marcas.”"]] })));

  rec.mark("limites");
  await answer(brand[1]);
  await turn("brand", 3);
  if (!(await state()).onboarding.brand.document) { await answer(brand[2]); await turn("brand", 4); }
  if (!(await state()).onboarding.brand.document) {
    await rec.click(page.getByRole("button", { name: "Gerar o documento agora" }));
    await rec.until(async () => Boolean((await window.pacto.request("bootstrap")).onboarding.brand.document), null);
  }

  rec.mark("documento");
  await page.locator(".document-text").waitFor();
  await rec.point(page.locator(".document-text"), 2000);
  await page.locator(".document-text").evaluate((el) => el.scrollTo({ top: el.scrollHeight * 0.18, behavior: "smooth" }));
  await rec.wait(2500);

  rec.mark("ativos");
  await page.locator(".document-text").evaluate((el) => { const at = el.value.search(/Ativos|gratuit/i); el.scrollTo({ top: Math.max(0, (at / el.value.length) * el.scrollHeight - 60), behavior: "smooth" }); });
  await rec.wait(4000);
  await rec.click(page.getByRole("button", { name: "Aprovar e continuar" }));

  rec.mark("continuidade");
  await page.getByRole("heading", { name: "Design Kit Oficial" }).waitFor();
  await rec.point(page.locator(".preset-grid button").first(), 1200);
  await rec.click(page.getByRole("button", { name: /^Creator/ }));
  await rec.point(page.locator(".reference-add").first(), 2500);

  rec.mark("kit");
  await rec.click(page.getByRole("button", { name: /Começar entrevista do Design Kit/ }));
  await turn("design", 1);
  await answer(design[0]);
  await turn("design", 2);
  if (!(await state()).onboarding.design.document) { await answer(design[1]); await turn("design", 3); }
  if (!(await state()).onboarding.design.document) {
    await rec.click(page.getByRole("button", { name: "Gerar o documento agora" }));
    await rec.until(async () => Boolean((await window.pacto.request("bootstrap")).onboarding.design.document), null);
  }
  await page.locator(".document-text").waitFor();
  await rec.point(page.locator(".document-text"), 3000);
  await rec.click(page.getByRole("button", { name: "Aprovar e continuar" }));

  rec.mark("instalado");
  await page.getByRole("heading", { name: "Seu projeto está instalado." }).waitFor();
  for (const item of await page.locator(".install-summary li").all()) await rec.point(item, 900);
  await rec.wait(1500);

  rec.mark("mudar");
  await rec.click(page.getByRole("button", { name: "Entrar no estúdio" }));
  await rec.wait(2000);
  await rec.click(page.locator(".main-nav button", { hasText: "Minha identidade" }));
  await rec.wait(3500);
  await rec.click(page.locator(".main-nav button", { hasText: "Biblioteca" }));

  rec.mark("acao");
  await rec.point(page.locator(".opportunities, .library-heading").first(), 3000);
  await rec.wait(3000);
  // Save the onboarding results for reference.
  const s = await state();
  await writeFile(join(rec.dir, "documentos.json"), JSON.stringify({ brand: s.profile?.brandContext, design: s.profile?.designKit }, null, 2));
  await rec.close();
} finally {
  await rec.finish();
}
console.log("aula-02 gravada");

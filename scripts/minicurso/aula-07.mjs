import { Recorder, cardHtml, emptyOnboarding, nicheProfile, nicheProject } from "./lib.mjs";

// Aula 7 — Quando algo sai errado (interface 0.3). Cada situação é mostrada no app com um
// projeto de exemplo no estado correspondente; as mensagens são as reais do aplicativo.
const day = 864e5, ago = (d) => new Date(Date.now() - d * day).toISOString();
const textOnly = (p) => ({ ...p, textApproved: false, status: "ready", slides: p.slides.map(({ image, versions, state, ...s }) => s) });
async function fixture() {
  const limite = textOnly(await nicheProject("confeiteira", { id: "p-limite", title: "Quanto custa o seu tempo na cozinha?" }));
  limite.error = "O limite da sua conta foi atingido. Aguarde a renovação indicada pelo ChatGPT.";
  const fechou = await nicheProject("moda-fitness", { id: "p-fechou", status: "generating" });
  fechou.slides = fechou.slides.map((s, i) => (i < 2 ? s : { ...s, image: undefined, versions: undefined, state: i === 2 ? "generating" : undefined }));
  const capa = await nicheProject("advogada", { id: "p-capa" });
  capa.coverOptions = [{ id: "c1", file: "x", image: capa.slides[0].image, createdAt: ago(0) }];
  capa.slides = capa.slides.map(({ image, versions, state, ...s }) => s);
  const pronto = await nicheProject("saas", { id: "p-pronto" });
  pronto.ctaKit = { ...(pronto.ctaKit || { keywords: ["CHECKLIST"], firstCardCta: "", lastCardCta: "", dm1: "", dm2: "" }), freebie: "Checklist dos 6 dados do agendamento — precisa ser preparado antes de publicar." };
  return { profile: await nicheProfile("confeiteira", "Doce Ofício"), onboarding: emptyOnboarding(), ideas: [], settings: { weeklyGoal: 5, driveFolder: "", firstCompletedAt: ago(10), lastReminderAt: ago(0) }, projects: [limite, fechou, capa, pronto] };
}
const rec = await new Recorder("aula-07").init();
try {
  const state = await fixture();
  const page = await rec.open(await rec.userData({ auth: true, state }));
  await rec.until(async () => (await window.pacto.request("bootstrap")).account?.connected, null, 120000);
  const home = async () => { if (await page.getByRole("button", { name: "Voltar ao início" }).count()) await rec.click(page.getByRole("button", { name: "Voltar ao início" })); };
  const openProject = async (title) => { await home(); await rec.click(page.getByRole("button", { name: `Abrir ${title}`, exact: true })); await rec.wait(1200); };

  rec.image("abertura", await rec.card("situacoes", cardHtml({ eyebrow: "AULA 07", title: "Quando algo <em>sai errado.</em>", items: [["1", "Limite da conta"], ["2", "Sessão expirada"], ["3", "App fechado no meio"], ["4", "Pautas genéricas"], ["5", "Texto sem a sua cara"]] })));

  rec.mark("limite");
  await openProject(state.projects[0].title);
  await rec.point(page.locator(".notice-strip.error"), 4000);
  await rec.point(page.locator(".outline-row").first(), 2500);

  rec.mark("fechou");
  await openProject(state.projects[1].title);
  await rec.point(page.locator(".notice-strip.error"), 3000);
  await rec.point(page.locator(".thumb").nth(2), 2000);

  rec.mark("demora");
  await rec.click(page.locator(".topbar .btn.primary"));
  await page.locator(".work-strip").waitFor({ timeout: 30000 });
  await rec.point(page.locator(".work-strip span").first(), 3500);
  await rec.click(page.locator(".work-strip").getByRole("button", { name: /Cancelar/ }));
  await rec.wait(2500);

  rec.mark("genericas");
  await home();
  await rec.click(page.getByRole("button", { name: "Marca", exact: true }));
  await rec.wait(1200);
  await rec.point(page.getByRole("region", { name: "Contexto da marca" }), 2000);
  await rec.click(page.getByRole("button", { name: "Início", exact: true }));
  await rec.click(page.getByRole("button", { name: "Gerar pautas" }));
  await rec.type(page.getByLabel(/Foco desta rodada/), "clientes que já tentaram vender bolo e desistiram", 25);
  await rec.point(page.getByRole("tab", { name: "Referências" }), 1800);

  rec.mark("texto");
  await openProject(state.projects[0].title);
  await rec.click(page.locator(".outline-row").first());
  await rec.click(page.getByRole("textbox", { name: "Texto", exact: true }));
  await page.keyboard.press("End");
  await rec.wait(800);
  await rec.type(page.getByLabel("Pedido para o assistente"), "Deixa mais direto e com um pouco de humor", 30);
  await rec.wait(1200);
  await rec.click(page.getByRole("button", { name: "Fechar painel" }));

  rec.mark("inventou");
  await rec.point(page.locator(".outline-row").nth(2), 3500);
  await rec.wait(2000);

  rec.mark("capa");
  await openProject(state.projects[2].title);
  await rec.point(page.getByRole("button", { name: /Gerar outras opções/ }), 2500);
  await rec.point(page.getByRole("button", { name: /Voltar ao texto/ }), 2500);

  rec.mark("card");
  await openProject(state.projects[3].title);
  await rec.click(page.getByRole("navigation", { name: "Etapas" }).getByRole("button", { name: "Carrossel" }));
  await rec.click(page.locator(".thumb").nth(2));
  await rec.click(page.locator(".stage-frame"));
  await rec.click(page.getByRole("button", { name: "Erro de ortografia" }));
  await rec.click(page.getByRole("button", { name: "Fora da identidade visual" }));
  await rec.wait(1500);
  await page.keyboard.press("Escape");
  await rec.click(page.getByRole("navigation", { name: "Etapas" }).getByRole("button", { name: "Publicar" }));

  rec.mark("celular");
  await rec.click(page.getByRole("button", { name: "Enviar para o celular" }));
  await page.locator(".qr img").waitFor({ timeout: 20000 });
  await rec.point(page.locator(".qr ol"), 2500);
  await rec.click(page.getByRole("button", { name: "Outros destinos" }));
  await rec.point(page.getByRole("button", { name: /Google Drive/ }), 1800);
  await rec.point(page.getByRole("button", { name: /Baixar ZIP/ }), 1800);
  await page.keyboard.press("Escape");

  rec.mark("material");
  await rec.click(page.getByRole("tab", { name: "Comentário e DM" }));
  await rec.point(page.locator(".box").filter({ hasText: "precisa ser preparado" }).first(), 4500);
  rec.image("acao", await rec.card("guarde", cardHtml({ eyebrow: "GUARDE ESTA AULA", title: "Travou? <em>A resposta está aqui.</em>", items: [["6", "Capa que não convence"], ["7", "Card com erro"], ["8", "IA inventou algo"], ["9", "Geração demorada"], ["10", "QR que não abre"]] })));
  await rec.close();

  // Sessão expirada: a mesma biblioteca, sem login.
  const offline = await rec.open(await rec.userData({ state }));
  rec.mark("sessao");
  await rec.wait(1500);
  await rec.click(offline.locator(".avatar-btn"));
  await rec.point(offline.getByRole("button", { name: /Conectar minha conta/ }), 3500);
  await rec.close();
} finally {
  await rec.finish();
}
console.log("aula-07 gravada");

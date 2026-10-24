import { Recorder, cardHtml, emptyOnboarding, nicheProfile, nicheProject } from "./lib.mjs";

// Aula 7 — Quando algo sai errado. Cada situação é mostrada no app com um projeto
// de exemplo no estado correspondente; as mensagens são as reais do aplicativo.
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
  const nav = (name) => page.locator(".main-nav button", { hasText: name });
  const openProject = async (title) => { await rec.click(nav("Biblioteca")); await rec.click(page.getByRole("button", { name: `Abrir ${title}`, exact: true })); await rec.wait(1200); };
  const back = () => rec.click(page.getByRole("button", { name: "Voltar para a biblioteca" }));

  rec.image("abertura", await rec.card("situacoes", cardHtml({ eyebrow: "AULA 07", title: "Quando algo <em>sai errado.</em>", items: [["1", "Limite da conta"], ["2", "Sessão expirada"], ["3", "App fechado no meio"], ["4", "Pautas genéricas"], ["5", "Texto sem a sua cara"]] })));

  rec.mark("limite");
  await openProject(state.projects[0].title);
  await rec.point(page.locator(".project-error"), 4000);
  await rec.point(page.locator(".copy-card").first(), 2500);
  await back();

  rec.mark("fechou");
  await openProject(state.projects[1].title);
  await rec.point(page.locator(".project-error"), 3000);
  await rec.point(page.locator(".slide-thumb").nth(2), 2000);

  rec.mark("demora");
  await rec.click(page.getByRole("button", { name: /Gerar restantes/ }));
  await page.locator(".progress-banner").waitFor({ timeout: 30000 });
  await rec.point(page.locator(".progress-banner span").first(), 3500);
  await rec.click(page.locator(".progress-banner button"));
  await rec.wait(2500);
  await back();

  rec.mark("genericas");
  await rec.click(nav("Minha identidade"));
  await rec.wait(1500);
  await rec.point(page.locator(".document-text").first(), 2000);
  await rec.click(nav("Pautas"));
  await rec.type(page.getByLabel(/Foco desta rodada/), "clientes que já tentaram vender bolo e desistiram", 25);
  await rec.point(page.getByRole("tab", { name: "Modelador de Referências" }), 1800);

  rec.mark("texto");
  await openProject(state.projects[0].title);
  const body = page.locator(".copy-card").first().locator("textarea").nth(1);
  await rec.click(body);
  await page.keyboard.press("End");
  await rec.wait(800);
  await rec.type(page.getByLabel("Mensagem para o assistente"), "Deixa mais direto e com um pouco de humor", 30);
  await rec.wait(1200);

  rec.mark("inventou");
  await rec.point(page.locator(".copy-card").nth(2).locator("textarea").nth(1), 3500);
  await rec.wait(2000);
  await back();

  rec.mark("capa");
  await openProject(state.projects[2].title);
  await rec.point(page.getByRole("button", { name: /Gerar outras opções/ }), 2500);
  await rec.point(page.getByRole("button", { name: /Voltar ao texto/ }), 2500);
  await back();

  rec.mark("card");
  await openProject(state.projects[3].title);
  await rec.click(page.getByRole("button", { name: /Ajustar os cards/ }));
  await rec.click(page.getByRole("button", { name: /^Slide 3:/ }));
  await rec.click(page.getByRole("button", { name: "Corrigir" }));
  await rec.click(page.getByRole("button", { name: "Erro de ortografia" }));
  await rec.click(page.getByRole("button", { name: "Fora da identidade visual" }));
  await rec.wait(1500);
  await rec.click(page.getByRole("button", { name: "Cancelar" }));
  await rec.click(page.getByRole("button", { name: "Pronto para publicar" }));

  rec.mark("celular");
  await rec.click(page.getByRole("button", { name: "Enviar para o celular" }));
  await page.locator(".share-qr").waitFor({ timeout: 20000 });
  await rec.point(page.locator(".share-steps"), 2000);
  await rec.point(page.locator(".share-dialog .field-hint"), 2500);
  await rec.click(page.getByRole("button", { name: "Concluir" }));
  await rec.click(page.getByRole("button", { name: "Salvar no Google Drive" }));
  await page.getByRole("button", { name: /Escolher outra pasta/ }).waitFor();
  await rec.point(page.getByRole("button", { name: /Escolher outra pasta/ }), 2500);
  await rec.click(page.getByRole("button", { name: "Concluir" }));

  rec.mark("material");
  await rec.click(page.locator("summary[aria-label=\"Mais ações do projeto\"]"));
  await rec.click(page.getByRole("button", { name: /CTA, DM e oferta/ }));
  await rec.point(page.locator(".cta-item").nth(2), 4500);
  await rec.click(page.getByRole("button", { name: "Fechar", exact: true }));
  rec.image("acao", await rec.card("guarde", cardHtml({ eyebrow: "GUARDE ESTA AULA", title: "Travou? <em>A resposta está aqui.</em>", items: [["6", "Capa que não convence"], ["7", "Card com erro"], ["8", "IA inventou algo"], ["9", "Geração demorada"], ["10", "QR que não abre"]] })));
  await rec.close();

  // Sessão expirada: a mesma biblioteca, sem login.
  const offline = await rec.open(await rec.userData({ state }));
  rec.mark("sessao");
  await rec.wait(1500);
  await rec.click(offline.locator(".account-menu summary"));
  await rec.point(offline.getByRole("button", { name: /Conectar minha conta/ }), 3500);
  await rec.close();
} finally {
  await rec.finish();
}
console.log("aula-07 gravada");

import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Recorder, NICHES, emptyOnboarding, nicheProfile, nicheProject } from "./lib.mjs";

// Vídeo da hero da landing do app: o fluxo inteiro com o Agendei (SaaS), num só take.
// O texto e os cards 2 a 4 são os da prova real do nicho; a capa já gerada entra como
// primeira opção e o app gera ao vivo outras 2, para a escolha entre 3 capas.
const radar = JSON.parse(await readFile(join(NICHES, "saas", "radar.json"), "utf8"));
const rec = await new Recorder("hero").init();
try {
  const project = await nicheProject("saas", { textApproved: false, status: "ready" });
  project.coverOptions = [{ id: randomUUID(), file: "agendei-capa.png", image: project.slides[0].image, createdAt: new Date().toISOString() }];
  project.slides[0] = { ...project.slides[0], image: undefined, versions: [], state: undefined };
  const state = { profile: await nicheProfile("saas", "Agendei"), onboarding: emptyOnboarding(), ideas: [radar], projects: [project], settings: { weeklyGoal: 5, driveFolder: "", firstCompletedAt: "", lastReminderAt: new Date().toISOString() } };
  const page = await rec.open(await rec.userData({ auth: true, state }));
  await rec.until(async () => (await window.pacto.request("bootstrap")).account?.connected, null, 120000);
  const nav = (name) => page.locator(".main-nav button", { hasText: name });
  const idle = () => rec.until(async () => { const p = (await window.pacto.request("bootstrap")).projects[0]; return !["planning", "generating"].includes(p.status); }, null, 1500000);

  rec.mark("radar");
  await rec.click(nav("Pautas"));
  await rec.wait(1200);
  const batch = page.locator(".idea-batch").first();
  await batch.locator("header h2").scrollIntoViewIfNeeded();
  await rec.point(batch.locator("header h2"), 1200);
  for (const card of (await batch.locator(".idea-card.top").all()).slice(0, 4)) await rec.point(card, 700);

  rec.mark("arquitetura");
  await rec.click(batch.locator(".idea-card.top").first().getByRole("button", { name: /Criar carrossel/ }));
  await rec.wait(1200);
  for (const option of (await page.locator(".architecture-grid button").all()).slice(0, 5)) await rec.point(option, 450);
  await rec.point(page.locator(".architecture-grid button[aria-checked='true']").first(), 1500);
  await rec.click(page.getByRole("button", { name: "Cancelar" }));

  rec.mark("texto");
  await rec.click(nav("Biblioteca"));
  await rec.click(page.getByRole("button", { name: /^Abrir 6 dados/ }));
  await page.locator(".copy-board").waitFor();
  await rec.wait(1000);
  const cards = page.locator(".copy-card");
  for (let i = 0; i < 4; i++) { await cards.nth(i).scrollIntoViewIfNeeded(); await rec.point(cards.nth(i).locator(".copy-title"), 650); }
  await cards.nth(0).scrollIntoViewIfNeeded();
  const title = cards.nth(0).locator(".copy-title");
  await rec.click(title);
  await page.keyboard.press("Control+A");
  await title.pressSequentially(project.title, { delay: 45 });
  await rec.wait(700);

  rec.mark("aprovar");
  await page.locator(".review-checklist").scrollIntoViewIfNeeded();
  for (const box of await page.locator(".review-checklist input").all()) await rec.click(box, 120);
  await rec.click(page.getByRole("button", { name: /Aprovar texto e criar a capa/ }));
  await page.getByRole("heading", { name: "Escolha a capa que faria você parar." }).waitFor();
  await rec.wait(800);

  rec.mark("capas");
  await rec.click(page.getByRole("button", { name: "2", exact: true }));
  await rec.click(page.getByRole("button", { name: "Gerar outras opções" }));
  await idle();
  await rec.wait(1200);
  for (const fig of await page.locator(".cover-options figure img").all()) await rec.point(fig, 1100);

  rec.mark("escolha");
  await rec.click(page.getByRole("button", { name: "Usar esta capa" }).first());

  rec.mark("pronto");
  await page.getByText(/Você fez. Agora publique hoje./).waitFor({ timeout: 60000 });
  await rec.wait(3500);
  await rec.point(page.locator(".publish-cards"), 2500);

  rec.mark("cta");
  await rec.click(page.locator("summary[aria-label=\"Mais ações do projeto\"]"));
  await rec.click(page.getByRole("button", { name: /CTA, DM e oferta/ }));
  await rec.wait(800);
  for (const item of (await page.locator(".cta-item").all()).slice(0, 4)) await rec.point(item, 900);
  await rec.click(page.getByRole("button", { name: "Fechar", exact: true }));

  rec.mark("celular");
  await rec.click(page.getByRole("button", { name: "Enviar para o celular" }));
  await page.locator(".share-qr").waitFor({ timeout: 20000 });
  await rec.point(page.locator(".share-qr"), 3000);
  await rec.click(page.getByRole("button", { name: "Concluir" }));
  await rec.wait(800);
  await rec.close();
} finally {
  await rec.finish();
}
console.log("hero gravado");

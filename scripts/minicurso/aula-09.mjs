import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Recorder, NICHES, ROOT, cardHtml, dataUrl, emptyOnboarding, nicheProfile, nicheProject } from "./lib.mjs";

// Aula 9 — Estilos, fotos e PDFs (interface 0.3), com o Agendei. Os estilos prontos são
// montados na hora pelo app; a série de fotos da cena vem da prova real anterior; o
// roteiro do material gratuito em PDF é gerado ao vivo pela conta.
const ago = (d) => new Date(Date.now() - d * 864e5).toISOString();
const series = join(ROOT, ".cache", "scene-series-proof");
const photos = await Promise.all([1, 2, 3, 4].map((i) => dataUrl(join(series, `foto-${i}.png`))));
const pending = (id, label) => ({ id, label, prompt: label, status: "pending", image: "", images: [] });
const project = await nicheProject("saas");
const state = {
  profile: await nicheProfile("saas", "Agendei"),
  onboarding: emptyOnboarding(),
  ideas: [JSON.parse(await readFile(join(NICHES, "saas", "radar.json"), "utf8"))],
  projects: [project],
  media: {
    displayName: "Agendei", handle: "agendei.app", verified: true, avatar: "", faces: [],
    scenes: [
      { id: "scene-recepcao", label: "Recepção da clínica pela manhã", prompt: "Balcão de recepção de uma pequena clínica de estética, agenda de papel, café, plantas e luz natural.", status: "approved", image: photos[0], images: photos },
      pending("scene-mesa", "Mesa com agenda aberta e celular ao lado"),
      pending("scene-fachada", "Fachada do salão no fim da tarde"),
    ],
  },
  settings: { weeklyGoal: 5, driveFolder: "", firstCompletedAt: ago(10), lastReminderAt: ago(0) },
};
const rec = await new Recorder("aula-09").init();
try {
  const page = await rec.open(await rec.userData({ auth: true, state }));
  page.setDefaultTimeout(20000);
  await rec.until(async () => (await window.pacto.request("bootstrap")).account?.connected, null, 120000);
  const steps = page.getByRole("navigation", { name: "Etapas" });
  const styles = page.getByRole("group", { name: "Estilo do carrossel" });
  const home = async () => { if (await page.getByRole("button", { name: "Voltar ao início" }).count()) await rec.click(page.getByRole("button", { name: "Voltar ao início" })); else await rec.click(page.getByRole("button", { name: "Início", exact: true })); await rec.wait(800); };
  const openProject = async () => { await home(); await rec.click(page.getByRole("button", { name: `Abrir ${project.title}`, exact: true })); await rec.wait(1000); };
  const idle = (id) => rec.until(async (id) => { const s = await window.pacto.request("bootstrap"); const p = s.projects.find((x) => x.id === id); return p && !["planning", "generating"].includes(p.status) && !s.working; }, id, 900000);

  rec.image("abertura", await rec.card("estilos", cardHtml({ eyebrow: "AULA 09 · ALÉM DA ARTE COM IA", title: "Estilos, fotos <em>e PDFs.</em>", items: [["1", "Tweet com selo"], ["2", "Só texto, branco ou preto"], ["3", "Texto com foto"], ["4", "Material e apresentação em PDF"]], letter: "T" })));

  rec.mark("estilos");
  await openProject();
  await rec.click(steps.getByRole("button", { name: "Carrossel" }));
  await rec.point(styles, 900);
  for (const style of ["Tweet", "Texto preto", "Texto + foto"]) {
    await rec.click(styles.getByRole("button", { name: style }));
    await page.locator(".cover-opt").nth(2).waitFor({ timeout: 60000 });
    await rec.wait(700);
    await rec.click(page.getByRole("button", { name: "Usar esta capa" }));
    await page.getByRole("button", { name: "Ir para publicar" }).waitFor({ timeout: 60000 });
    await rec.wait(1500);
  }
  await rec.point(styles.getByRole("button", { name: "Foto de fundo" }), 700);
  await rec.point(styles.getByRole("button", { name: "Sua foto" }), 900);

  rec.mark("marca");
  await home();
  await rec.click(page.getByRole("button", { name: "Marca", exact: true }));
  await rec.wait(900);
  const profile = page.getByRole("region", { name: "Perfil e fotos" });
  await profile.scrollIntoViewIfNeeded();
  await rec.point(profile.getByRole("button", { name: /Enviar foto/ }), 1200);
  await rec.point(profile.getByLabel("@ do Instagram"), 1200);
  await rec.point(profile.locator(".tweet-preview"), 1400);
  await rec.point(profile.getByRole("button", { name: /Adicionar foto/ }), 1500);

  rec.mark("cenas");
  await page.locator(".scene-grid").scrollIntoViewIfNeeded();
  await rec.point(page.getByRole("button", { name: /Sugerir cenas/ }), 1000);
  await rec.point(page.locator(".scene.pending").first().getByRole("button", { name: "Aprovar" }), 1300);
  await rec.point(page.locator(".scene.approved").first(), 1000);
  for (const img of await page.locator(".scene.approved .series img").all()) await rec.point(img, 500);
  await openProject();
  await rec.click(steps.getByRole("button", { name: "Carrossel" }));
  for (const n of [1, 2, 3]) { await rec.click(page.locator(".thumb").nth(n)); await rec.wait(700); }

  rec.mark("pdf");
  await rec.click(steps.getByRole("button", { name: "Publicar" }));
  await rec.click(page.getByRole("tab", { name: "Comentário e DM" }));
  await rec.click(page.getByRole("button", { name: "Criar PDF com a sua marca" }));
  await steps.getByRole("button", { name: "Roteiro" }).waitFor();
  const material = (await page.evaluate(() => window.pacto.request("bootstrap"))).projects.find((p) => p.format === "material").id;
  await idle(material);
  await page.locator(".outline-row").first().waitFor();
  await rec.wait(800);
  for (const row of (await page.locator(".outline-row").all()).slice(0, 3)) await rec.point(row, 400);
  await rec.click(page.getByRole("button", { name: "Aprovar roteiro" }));
  await page.locator(".cover-opt").nth(2).waitFor({ timeout: 60000 });
  await rec.wait(700);
  await rec.click(page.locator(".cover-opt").nth(1));
  await rec.click(page.getByRole("button", { name: "Usar esta capa" }));
  await page.locator(".stage-frame.a4").waitFor({ timeout: 60000 });
  await rec.wait(800);
  for (const n of [1, 2, 3]) { await rec.click(page.locator(".thumb").nth(n)); await rec.wait(500); }
  await rec.click(page.getByRole("button", { name: "Ir para exportar" }));
  await rec.wait(800);
  await rec.point(page.getByRole("button", { name: "Baixar PDF" }).last(), 1800);

  rec.mark("apresentacao");
  await home();
  await rec.click(page.getByRole("button", { name: /Formato/ }));
  await rec.point(page.getByRole("menuitemradio", { name: /^Apresentação/ }), 1800);
  await page.keyboard.press("Escape");
  await openProject();
  await rec.click(steps.getByRole("button", { name: "Publicar" }));
  await rec.click(page.getByRole("button", { name: "Outros destinos" }));
  await rec.point(page.getByRole("button", { name: /PDF para o LinkedIn/ }), 2200);
  await page.keyboard.press("Escape");

  rec.mark("acao");
  await home();
  await rec.point(page.getByRole("heading", { name: "O que vamos publicar hoje?" }), 1200);
  await rec.point(page.getByRole("button", { name: /Estilo/ }), 1500);
  await rec.wait(1000);
  await rec.close();
} finally {
  await rec.finish();
}
console.log("aula-09 gravada");

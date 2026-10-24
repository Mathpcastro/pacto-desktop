import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Recorder, NICHES, ROOT, emptyOnboarding, nicheProfile, nicheProject } from "./lib.mjs";

// Captura da tela Ritmo (tema escuro, marca Carrossell) para a landing /app.
// Os resultados são números de exemplo, como na aula 06; o Agendei é o projeto atual.
const day = 864e5, ago = (d) => new Date(Date.now() - d * day).toISOString();
const rec = await new Recorder("ritmo-shot").init();
try {
  const state = {
    profile: await nicheProfile("saas", "Agendei"), onboarding: emptyOnboarding(),
    ideas: [JSON.parse(await readFile(join(NICHES, "saas", "radar.json"), "utf8"))],
    settings: { weeklyGoal: 6, driveFolder: "", firstCompletedAt: ago(10), lastReminderAt: ago(0) },
    projects: [
      await nicheProject("saas", { publishedAt: ago(4) }),
      await nicheProject("advogada", { publishedAt: ago(6), results: { comments: 48, saves: 156, sales: 3, recordedAt: ago(3) } }),
      await nicheProject("moda-fitness", { publishedAt: ago(8), results: { comments: 9, saves: 22, sales: 0, recordedAt: ago(5) } }),
    ],
  };
  const page = await rec.open(await rec.userData({ auth: true, state }));
  await rec.until(async () => (await window.pacto.request("bootstrap")).account?.connected, null, 120000);
  const dark = page.getByRole("button", { name: "Ativar tema escuro" });
  if (await dark.count()) await dark.click();
  await rec.click(page.locator(".main-nav button", { hasText: "Ritmo" }));
  await rec.wait(1500);
  await page.evaluate(() => window.__recMove?.(900, 560));
  await rec.wait(900);
  const png = await rec.app.evaluate(async ({ BrowserWindow }, id) => (await BrowserWindow.fromId(id).webContents.capturePage()).toPNG().toString("base64"), rec.mainId);
  await writeFile(join(ROOT, ".cache", "minicurso", "ritmo-shot", "ritmo.png"), Buffer.from(png, "base64"));
  await rec.close();
} finally {
  await rec.finish();
}
console.log("ritmo capturado");

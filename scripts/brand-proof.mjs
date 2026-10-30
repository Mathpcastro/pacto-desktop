import assert from "node:assert/strict";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron } from "@playwright/test";
import { createServer } from "vite";

// Prova da Marca em seções: barra lateral, uma seção por vez, quanto a página rola em cada uma, aba
// lembrada, atalho do Ctrl K e tela estreita. Uso: node scripts/brand-proof.mjs [pasta-de-saída]
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] || join(root, ".cache", "brand-proof"));
await mkdir(out, { recursive: true });
const userData = await mkdtemp(join(tmpdir(), "carrossell-brand-"));
const server = await createServer({ root, logLevel: "error", server: { host: "127.0.0.1", port: 0, strictPort: false } });
await server.listen();
const app = await _electron.launch({ args: ["."], cwd: root, env: { ...process.env, PACTO_USER_DATA: userData, PACTO_DEV_URL: `http://127.0.0.1:${server.httpServer.address().port}` } });
const step = (name) => console.log("✔", name);
try {
  const page = await app.firstWindow();
  await page.waitForFunction(() => window.pacto);
  await page.evaluate(() =>
    window.pacto.request("saveProfile", {
      profile: { brand: "Ana Doces", brandContext: "# CONTEXTO OFICIAL DA MARCA\n\n## Negócio\nDoces por encomenda.\n\n## Público\nMães que organizam festas.", designKit: "# DESIGN KIT\n\nPaleta: #e94e77 destaque, #2b2b2b texto, #fff6ef fundo." },
    }),
  );
  await page.reload();
  await page.getByRole("button", { name: /^Marca$/ }).click();
  const nav = page.getByRole("navigation", { name: "Seções da marca" });
  await nav.waitFor();
  // Quanto a página rola em cada seção (a janela de teste tem 940 px de altura).
  const scroll = () => page.evaluate(() => { const el = document.querySelector(".shell-main"); return Math.max(0, (el?.scrollHeight || document.documentElement.scrollHeight) - (el?.clientHeight || innerHeight)); });
  const sizes = {};
  for (const [label, file] of [["Contexto da marca", "01-contexto"], ["Design Kit", "02-design"], ["Perfil", "03-perfil"], ["Fotos", "04-fotos"], ["Imagens da marca", "05-imagens"], ["Otimizar", "06-otimizar"], ["Instagram", "07-instagram"], ["Agentes", "08-agentes"]]) {
    await nav.getByRole("button", { name: new RegExp(`^${label}`) }).click();
    await page.waitForTimeout(150);
    sizes[label] = await scroll();
    await page.screenshot({ path: join(out, `${file}.png`) });
  }
  console.log("rolagem por seção (px):", JSON.stringify(sizes));
  step("cada seção abre sozinha à direita");

  await nav.getByRole("button", { name: /^Design Kit/ }).click();
  await page.reload();
  await page.getByRole("button", { name: /^Marca$/ }).click();
  assert.equal(await nav.getByRole("button", { name: /^Design Kit/ }).getAttribute("aria-current"), "page");
  step("a seção escolhida fica lembrada");

  await page.keyboard.press("Control+K");
  await page.keyboard.type("Marca: Fotos");
  await page.keyboard.press("Enter");
  await page.getByRole("region", { name: "Fotos" }).waitFor();
  step("Ctrl K abre a Marca direto numa seção");

  await page.setViewportSize({ width: 700, height: 900 });
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(out, "09-estreita.png") });
  step("em tela estreita, as seções viram botões no topo");
} finally {
  await app.close().catch(() => {});
  await server.close();
  await rm(userData, { recursive: true, force: true }).catch(() => {});
}

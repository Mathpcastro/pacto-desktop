import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { _electron } from "@playwright/test";

// Renderiza capas de amostra de cada estilo pelo runtime real (sem IA) e grava os PNGs.
// Uso: node scripts/render-check.mjs <pasta> (rode `npm run build` antes)
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const out = resolve(process.argv[2] || join(root, ".cache", "render-check"));
await mkdir(out, { recursive: true });
const userData = await mkdtemp(join(tmpdir(), "carrossell-render-"));
const app = await _electron.launch({ args: ["."], cwd: root, env: { ...process.env, PACTO_USER_DATA: userData } });
try {
  const page = await app.firstWindow();
  await page.waitForFunction(() => typeof window.pacto?.request === "function");
  const covers = await page.evaluate(async () => {
    const r = window.pacto.request;
    await r("saveProfile", { profile: { brand: "Agendei", designKit: "#3CC8A0 destaque #1E2328 texto #FFFFFF fundo #F5F7F6 apoio" } });
    await r("saveMedia", { handle: "agendei.app" });
    const found = {};
    for (const style of ["tweet", "texto", "textopreto", "recorte"]) {
      const p = await r("createProject", { title: style, brief: "teste", style });
      await r("saveProject", { id: p.id, slides: [{ id: "a", title: "4 informações que toda confirmação precisa ter", body: "Texto de apoio escrito à mão.", emphasis: "confirmação" }, { id: "b", title: "Dois", body: "" }] });
      await r("approveText", { id: p.id });
      const done = await r("generateCovers", { id: p.id }).catch((e) => ({ error: e.message }));
      found[style] = done.error || done.coverOptions.map((o) => o.image);
    }
    return found;
  });
  for (const [style, list] of Object.entries(covers)) {
    if (typeof list === "string") {
      console.log(style, "ERRO", list);
      continue;
    }
    for (const [i, url] of list.entries()) {
      const bytes = Buffer.from(url.split(",")[1], "base64");
      await writeFile(join(out, `${style}-${i}.png`), bytes);
      console.log(style, i, bytes.readUInt32BE(16), bytes.readUInt32BE(20));
    }
  }
} finally {
  await app.evaluate(({ app }) => app.exit(0)).catch(() => {});
}

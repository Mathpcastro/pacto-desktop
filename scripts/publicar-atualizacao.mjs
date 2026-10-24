import { copyFile, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Copia a versão atual para a pasta /download/ do site, de onde os apps instalados
// baixam a atualização (electron-updater, provedor "generic").
// Uso: node scripts/publicar-atualizacao.mjs [--mac <pasta do artefato pacto-mac>] [--site <pasta download>]
// Windows vem de release/ (npm run dist); Mac vem do artefato "pacto-mac" do GitHub Actions.
// Padrão do site: ../Método Pacto/download. Depois, gere o build do site e suba na Hostinger.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const option = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const target = resolve(option("--site") || join(root, "..", "Método Pacto", "download"));
const macDir = option("--mac") && resolve(option("--mac"));
const { version } = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const field = (text, name) => new RegExp(`^${name}:\\s*(.+)$`, "m").exec(text)?.[1]?.trim().replace(/^'|'$/g, "");

async function feed(dir, file) {
  const text = await readFile(join(dir, file), "utf8");
  if (field(text, "version") !== version) throw new Error(`${join(dir, file)} é da versão ${field(text, "version")}, mas o package.json está em ${version}.`);
  return [...text.matchAll(/^\s+- url: (.+)$/gm)].map((m) => m[1].trim());
}
const plans = [];
const winFiles = await feed(join(root, "release"), "latest.yml");
plans.push({ dir: join(root, "release"), yml: "latest.yml", files: winFiles.flatMap((f) => [f, `${f}.blockmap`]), old: /^PACTO-Setup-.*\.exe(\.blockmap)?$/ });
if (macDir) {
  const macFiles = await feed(macDir, "latest-mac.yml");
  const extra = (await readdir(macDir)).filter((f) => f.endsWith(".blockmap"));
  plans.push({ dir: macDir, yml: "latest-mac.yml", files: [...macFiles, ...extra], old: /^PACTO-.*-mac-.*\.(dmg|zip)(\.blockmap)?$/ });
}
await mkdir(target, { recursive: true });
for (const plan of plans) {
  // Mantém só a versão atual na pasta pública.
  for (const name of await readdir(target)) if (plan.old.test(name)) await rm(join(target, name));
  for (const name of new Set(plan.files)) await copyFile(join(plan.dir, name), join(target, name));
  // O .yml por último: os apps só enxergam a versão nova quando os arquivos já estão lá.
  await copyFile(join(plan.dir, plan.yml), join(target, plan.yml));
}
console.log(`Versão ${version} pronta em ${target}`);
for (const name of (await readdir(target)).filter((n) => /\.(exe|dmg)$/.test(n)).sort()) console.log(`https://carrosseisquevendem.com.br/download/${name}`);

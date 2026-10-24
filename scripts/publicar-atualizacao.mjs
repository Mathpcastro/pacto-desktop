import { copyFile, mkdir, readFile, readdir, rm } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Copia a versão gerada por `npm run dist` para a pasta /download/ do site, de onde
// os apps instalados baixam a atualização (electron-updater, provedor "generic").
// Uso: node scripts/publicar-atualizacao.mjs [pasta do site]
// Padrão: ../Método Pacto/download. Depois, gere o build do site e suba na Hostinger.
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const target = resolve(process.argv[2] || join(root, "..", "Método Pacto", "download"));
const release = join(root, "release");
const latest = await readFile(join(release, "latest.yml"), "utf8");
const version = /^version:\s*(.+)$/m.exec(latest)?.[1]?.trim();
const installer = /^path:\s*(.+)$/m.exec(latest)?.[1]?.trim();
const { version: packageVersion } = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
if (!version || !installer) throw new Error("release/latest.yml incompleto. Rode npm run dist antes.");
if (version !== packageVersion) throw new Error(`release/ tem a versão ${version}, mas o package.json está em ${packageVersion}. Rode npm run dist de novo.`);
await mkdir(target, { recursive: true });
// Mantém só a versão atual na pasta pública.
for (const name of await readdir(target)) if (/^PACTO-Setup-.*\.exe(\.blockmap)?$/.test(name)) await rm(join(target, name));
for (const name of [installer, `${installer}.blockmap`]) await copyFile(join(release, name), join(target, name));
// latest.yml por último: os apps só enxergam a versão nova quando os arquivos já estão lá.
await copyFile(join(release, "latest.yml"), join(target, "latest.yml"));
console.log(`Versão ${version} pronta em ${target}`);
console.log(`Download para compradores: https://carrosseisquevendem.com.br/download/${installer}`);

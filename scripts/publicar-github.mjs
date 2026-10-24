import { execFileSync } from "node:child_process";
import { copyFile, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Publica a versão atual como release no repositório público de instaladores.
// Os apps instalados leem o latest.yml dessa release (electron-updater, provedor "github"),
// e a área de membros usa os nomes fixos, que sempre baixam a versão mais nova:
//   https://github.com/Mathpcastro/pacto-releases/releases/latest/download/PACTO-Windows.exe
// Uso: node scripts/publicar-github.mjs [--mac <pasta do artefato pacto-mac> [--mac-sem-atualizacao]]
// Windows vem de release/ (npm run dist); Mac vem do artefato "pacto-mac" do GitHub Actions.
const REPO = "Mathpcastro/pacto-releases";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const option = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : undefined; };
const macDir = option("--mac") && resolve(option("--mac"));
// Mac sem assinatura da Apple não se atualiza sozinho (exigência do Squirrel.Mac): só os .dmg.
const macUnsigned = process.argv.includes("--mac-sem-atualizacao");
const { version } = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
const field = (text, name) => new RegExp(`^${name}:\\s*(.+)$`, "m").exec(text)?.[1]?.trim().replace(/^'|'$/g, "");
async function feed(dir, file) {
  const text = await readFile(join(dir, file), "utf8");
  if (field(text, "version") !== version) throw new Error(`${join(dir, file)} é da versão ${field(text, "version")}, mas o package.json está em ${version}.`);
  return [...text.matchAll(/^\s+- url: (.+)$/gm)].map((m) => m[1].trim());
}

const stage = await mkdtemp(join(tmpdir(), "pacto-release-"));
const files = [];
const add = async (dir, name, as = name) => { await copyFile(join(dir, name), join(stage, as)); files.push(join(stage, as)); };
try {
  const release = join(root, "release");
  const [installer] = await feed(release, "latest.yml");
  await add(release, installer); await add(release, `${installer}.blockmap`); await add(release, "latest.yml");
  await add(release, installer, "PACTO-Windows.exe");
  if (macDir) {
    const macFiles = await feed(macDir, "latest-mac.yml");
    for (const name of macFiles.filter((f) => f.endsWith(".dmg"))) await add(macDir, name);
    await add(macDir, macFiles.find((f) => /arm64\.dmg$/.test(f)), "PACTO-Mac-AppleSilicon.dmg");
    await add(macDir, macFiles.find((f) => /x64\.dmg$/.test(f)), "PACTO-Mac-Intel.dmg");
    if (!macUnsigned) {
      for (const name of macFiles.filter((f) => f.endsWith(".zip"))) await add(macDir, name);
      for (const name of (await readdir(macDir)).filter((f) => f.endsWith(".blockmap"))) await add(macDir, name);
      await add(macDir, "latest-mac.yml");
    }
  }
  const tag = `v${version}`;
  const gh = (args) => execFileSync("gh", args, { stdio: "inherit" });
  let exists = true;
  try { execFileSync("gh", ["release", "view", tag, "--repo", REPO], { stdio: "ignore" }); } catch { exists = false; }
  if (exists) gh(["release", "upload", tag, "--repo", REPO, "--clobber", ...files]);
  else gh(["release", "create", tag, "--repo", REPO, "--title", `PACTO ${version}`, "--notes", `PACTO ${version} para Windows e Mac.`, "--latest", ...files]);
  console.log(`Release ${tag} publicada em https://github.com/${REPO}/releases/tag/${tag}`);
  for (const name of ["PACTO-Windows.exe", ...(macDir ? ["PACTO-Mac-AppleSilicon.dmg", "PACTO-Mac-Intel.dmg"] : [])])
    console.log(`https://github.com/${REPO}/releases/latest/download/${name}`);
} finally {
  await rm(stage, { recursive: true, force: true });
}

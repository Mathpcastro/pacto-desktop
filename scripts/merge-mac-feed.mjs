import { readFile } from "node:fs/promises";

// Junta os latest-mac.yml dos builds Apple Silicon e Intel num só. O electron-updater
// escolhe o arquivo com "arm64" no nome em Macs Apple Silicon e o outro nos Intel.
// Uso: node scripts/merge-mac-feed.mjs <arm64/latest-mac.yml> <x64/latest-mac.yml> > latest-mac.yml
const parse = (text) => {
  const files = [...text.matchAll(/^\s+- url: (.+)\n\s+sha512: (.+)\n\s+size: (\d+)/gm)].map(([, url, sha512, size]) => ({ url: url.trim(), sha512: sha512.trim(), size: Number(size) }));
  const field = (name) => new RegExp(`^${name}: (.+)$`, "m").exec(text)?.[1]?.trim();
  return { version: field("version"), releaseDate: field("releaseDate"), files };
};
const feeds = await Promise.all(process.argv.slice(2).map(async (file) => parse(await readFile(file, "utf8"))));
if (feeds.length < 2 || feeds.some((f) => !f.version || !f.files.length)) throw new Error("Passe os dois latest-mac.yml (arm64 e x64).");
if (new Set(feeds.map((f) => f.version)).size > 1) throw new Error("Os builds têm versões diferentes.");
const files = feeds.flatMap((f) => f.files);
// Campos antigos (path/sha512) apontam para o zip Intel, como no formato do electron-builder.
const legacy = files.find((f) => f.url.endsWith(".zip") && !f.url.includes("arm64")) || files[0];
const lines = [`version: ${feeds[0].version}`, "files:"];
for (const f of files) lines.push(`  - url: ${f.url}`, `    sha512: ${f.sha512}`, `    size: ${f.size}`);
lines.push(`path: ${legacy.url}`, `sha512: ${legacy.sha512}`, `releaseDate: '${feeds.map((f) => f.releaseDate).sort().at(-1)?.replace(/^'|'$/g, "")}'`);
process.stdout.write(lines.join("\n") + "\n");

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Transcreve o áudio dos clipes do clone (ElevenLabs Scribe) e grava o tempo de cada palavra
// em avatar.json, para a legenda seguir exatamente a fala que está no clipe.
// Uso: node scripts/reels-avatar-words.mjs <pasta dos clipes> <avatar.json>
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]));
const [folder, metaFile] = process.argv.slice(2).map((p) => resolve(p));
const meta = existsSync(metaFile) ? JSON.parse(readFileSync(metaFile, "utf8")) : {};
for (const name of readdirSync(folder).filter((n) => n.startsWith("cena-") && n.endsWith(".mp4"))) {
  const id = name.slice(0, -4), entry = meta[id];
  if (!entry?.audio || entry.words) continue;
  const wav = join(folder, `${id}.wav`);
  execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", join(folder, name), "-vn", "-ac", "1", "-ar", "16000", wav]);
  const form = new FormData();
  form.set("model_id", "scribe_v1"); form.set("language_code", "por"); form.set("timestamps_granularity", "word");
  form.set("file", new Blob([readFileSync(wav)]), `${id}.wav`);
  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", headers: { "xi-api-key": env.ELEVENLABS_API_KEY }, body: form });
  if (!res.ok) throw new Error(`${id}: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const words = (data.words || []).filter((w) => w.type === "word").map((w) => ({ word: w.text, start: Number(w.start.toFixed(2)), end: Number(w.end.toFixed(2)) }));
  entry.words = words; entry.text = data.text;
  if (words.length) { entry.speechStart = words[0].start; entry.speechEnd = words[words.length - 1].end; }
  console.log(`${id}: ${words.length} palavras · ${entry.speechStart}s → ${entry.speechEnd}s · "${data.text}"`);
}
writeFileSync(metaFile, JSON.stringify(meta, null, 2));

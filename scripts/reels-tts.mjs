import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Narração do Reels com a voz clonada, um MP3 por trecho, com o tempo de cada palavra
// (para a legenda palavra por palavra e para cortar as cenas na fala certa).
// Pula trechos já gerados. Usage: node scripts/reels-tts.mjs
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(root, "docs", "reels", "roteiro.json"), "utf8"));
const env = Object.fromEntries(readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]));
const dir = join(root, ".cache", "reels", "voz");
mkdirSync(dir, { recursive: true });
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36);
// Agrupa os tempos por caractere em palavras.
function words(text, alignment) {
  const out = [];
  let current = null;
  alignment.characters.forEach((ch, i) => {
    const start = alignment.character_start_times_seconds[i], end = alignment.character_end_times_seconds[i];
    if (/\s/.test(ch)) { if (current) { out.push(current); current = null; } return; }
    if (!current) current = { word: ch, start, end }; else { current.word += ch; current.end = end; }
  });
  if (current) out.push(current);
  return out;
}
let spent = 0;
const manifest = {};
for (const [id, beat] of Object.entries(data.beats)) {
  // Trechos sem fala (ex.: gancho só com texto) não vão ao ElevenLabs.
  if (!beat.narration) { manifest[id] = { file: null, seconds: beat.seconds || 3, text: "", words: [] }; continue; }
  const base = join(dir, `${id}-${hash(beat.narration + (beat.speed ? `@${beat.speed}` : ""))}`);
  if (!existsSync(`${base}.json`)) {
    const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${data.voice}/with-timestamps?output_format=mp3_44100_192`, {
      method: "POST",
      headers: { "xi-api-key": env.ELEVENLABS_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ text: beat.narration, model_id: data.model, language_code: "pt", voice_settings: { stability: 0.45, similarity_boost: 0.85, style: 0.35, use_speaker_boost: true, ...(beat.speed ? { speed: beat.speed } : {}) } }),
    });
    if (!res.ok) throw new Error(`${id}: ${res.status} ${(await res.text()).slice(0, 200)}`);
    const body = await res.json();
    writeFileSync(`${base}.mp3`, Buffer.from(body.audio_base64, "base64"));
    writeFileSync(`${base}.json`, JSON.stringify(words(beat.narration, body.alignment)));
    spent += beat.narration.length;
  }
  const seconds = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", `${base}.mp3`], { encoding: "utf8" }));
  manifest[id] = { file: `${base}.mp3`, seconds, text: beat.narration, words: JSON.parse(readFileSync(`${base}.json`, "utf8")) };
}
writeFileSync(join(dir, "..", "voz.json"), JSON.stringify(manifest, null, 2));
for (const [name, ids] of Object.entries(data.variants)) console.log(`variação ${name}: ${ids.reduce((s, id) => s + manifest[id].seconds, 0).toFixed(1)} s de fala`);
console.log(`caracteres gastos nesta execução: ${spent}`);

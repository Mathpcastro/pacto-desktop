import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Gera a narração do minicurso, um MP3 por trecho, com a voz clonada no
// ElevenLabs. Pula trechos já gerados (o texto entra no nome do cache), para
// nunca gastar crédito duas vezes. Usage: node scripts/minicurso-tts.mjs aula-01 [aula-02 ...]
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(root, "docs", "minicurso", "roteiros.json"), "utf8"));
const env = Object.fromEntries(readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]));
const VOICE = "4XT3b7qYZZ1MI52Ll4WR";
const wanted = process.argv.slice(2);
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7).toString(36);
let spent = 0;
for (const lesson of data.lessons.filter((l) => !wanted.length || wanted.includes(l.id))) {
  const dir = join(root, ".cache", "minicurso", lesson.id, "voz");
  mkdirSync(dir, { recursive: true });
  const manifest = [];
  for (const beat of lesson.beats) {
    const file = join(dir, `${beat.id}-${hash(beat.narration)}.mp3`);
    if (!existsSync(file)) {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE}?output_format=mp3_44100_192`, {
        method: "POST",
        headers: { "xi-api-key": env.ELEVENLABS_API_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ text: beat.narration, model_id: data.model, language_code: "pt", voice_settings: { stability: 0.5, similarity_boost: 0.85, style: 0.2, use_speaker_boost: true } }),
      });
      if (!res.ok) throw new Error(`${lesson.id}/${beat.id}: ${res.status} ${(await res.text()).slice(0, 200)}`);
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      spent += beat.narration.length;
    }
    const seconds = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" }));
    manifest.push({ id: beat.id, file, seconds, text: beat.narration });
  }
  writeFileSync(join(dir, "..", "voz.json"), JSON.stringify(manifest, null, 2));
  console.log(`${lesson.id}: ${manifest.length} trechos, ${manifest.reduce((s, b) => s + b.seconds, 0).toFixed(1)} s de fala`);
}
console.log(`caracteres gastos nesta execução: ${spent}`);

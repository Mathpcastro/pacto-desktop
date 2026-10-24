import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Confere os clipes do Seedance 2.5: transcreve o áudio que o modelo gerou e compara com a
// narração esperada. Clipes aprovados ganham o tempo de cada palavra para a legenda.
// Uso: node scripts/reels-sd25-check.mjs <pasta com sd25-<id>.mp4> [saida.json]
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(readFileSync(join(root, ".env.local"), "utf8").split(/\r?\n/).filter((l) => l.includes("=")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^["']|["']$/g, "")]));
const voice = JSON.parse(readFileSync(join(root, ".cache", "reels", "voz.json"), "utf8"));
const folder = resolve(process.argv[2]);
const outFile = resolve(process.argv[3] || join(folder, "sd25-check.json"));
const report = existsSync(outFile) ? JSON.parse(readFileSync(outFile, "utf8")) : {};
// Números por extenso viram dígitos na transcrição; comparamos só o que importa.
const NUMBERS = { "trinta": "30", "cento e doze": "112", "quatro mil e oito reais": "r$ 4.008", "quatro mil": "4 mil", "nove mil e quatrocentos": "9.400", "quarenta e sete reais": "r$ 47" };
const norm = (t) => { let s = t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, ""); for (const [k, v] of Object.entries(NUMBERS)) s = s.replaceAll(k.normalize("NFD").replace(/[̀-ͯ]/g, ""), v); return s.replace(/[^a-z0-9$ ]+/g, " ").replace(/\s+/g, " ").trim(); };
const tokens = (t) => norm(t).split(" ").filter(Boolean);
for (const name of readdirSync(folder).filter((n) => /^sd25-.+\.mp4$/.test(n))) {
  const id = name.slice(5, -4);
  if (report[id]?.transcript) continue;
  const expected = voice[id]?.text;
  if (!expected) { console.log(`${id}: sem narração esperada`); continue; }
  const wav = join(folder, `${id}.check.wav`);
  try { execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", join(folder, name), "-vn", "-ac", "1", "-ar", "16000", wav]); }
  catch { report[id] = { ok: false, reason: "clipe sem áudio" }; console.log(`${id}: SEM ÁUDIO`); continue; }
  const form = new FormData();
  form.set("model_id", "scribe_v1"); form.set("language_code", "por"); form.set("timestamps_granularity", "word");
  form.set("file", new Blob([readFileSync(wav)]), `${id}.wav`);
  const res = await fetch("https://api.elevenlabs.io/v1/speech-to-text", { method: "POST", headers: { "xi-api-key": env.ELEVENLABS_API_KEY }, body: form });
  if (!res.ok) throw new Error(`${id}: ${res.status} ${(await res.text()).slice(0, 200)}`);
  const data = await res.json();
  const got = tokens(data.text), want = tokens(expected);
  // Palavras esperadas que não apareceram (ou apareceram trocadas) e palavras a mais.
  const missing = want.filter((w) => !got.includes(w)), extra = got.filter((w) => !want.includes(w));
  const ok = missing.length === 0 && extra.length === 0 && got.length === want.length;
  const words = (data.words || []).filter((w) => w.type === "word").map((w) => ({ word: w.text, start: Number(w.start.toFixed(2)), end: Number(w.end.toFixed(2)) }));
  const duration = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", join(folder, name)], { encoding: "utf8" }));
  report[id] = { ok, transcript: data.text, missing, extra, words, duration, speechStart: words[0]?.start, speechEnd: words.at(-1)?.end };
  console.log(`${id}: ${ok ? "OK" : "DIFERENTE"} · "${data.text}"${ok ? "" : ` · faltou [${missing.join(", ")}] sobrou [${extra.join(", ")}]`}`);
}
writeFileSync(outFile, JSON.stringify(report, null, 2));

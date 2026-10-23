import { execFileSync } from "node:child_process";
import { resolve, join } from "node:path";

// Monta a videoaula "Como usar o PACTO": cada bloco da filmagem real é acelerado
// para durar o tempo da fala correspondente, e a narração entra por cima.
// Usage: node scripts/videoaula.mjs <filmagem.mp4> <pasta-da-narracao> <saida.mp4>
const [footage, voiceDir, output] = process.argv.slice(2).map((p) => resolve(p));
// Início e fim de cada bloco na filmagem (segundos), achados pelas trocas de cena.
const blocks = [
  ["1-entrevista", 0, 58],
  ["2-design", 58, 138],
  ["3-radar", 138, 222],
  ["4-texto", 222, 275],
  ["5-capa", 275, 336],
  ["6-carrossel", 336, 543],
  ["7-publicar", 543, 575],
];
const lead = 0.35, tail = 0.9, hold = 2.5;
const duration = (file) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" }));
let at = 0;
const parts = [], audios = [], inputs = ["-i", footage];
blocks.forEach(([name, start, end], i) => {
  const voice = join(voiceDir, `${name}.mp3`);
  const target = lead + duration(voice) + tail + (i === blocks.length - 1 ? hold : 0);
  const speed = (end - start) / target;
  parts.push(`[0:v]trim=${start}:${end},setpts=(PTS-STARTPTS)/${speed.toFixed(4)},fps=30[v${i}]`);
  inputs.push("-i", voice);
  audios.push(`[${i + 1}:a]adelay=${Math.round((at + lead) * 1000)}|${Math.round((at + lead) * 1000)},aformat=channel_layouts=stereo[a${i}]`);
  console.log(`${name.padEnd(13)} ${start}-${end}s → ${target.toFixed(1)}s (${speed.toFixed(1)}x) a partir de ${at.toFixed(1)}s`);
  at += target;
});
const graph = [
  ...parts,
  `${blocks.map((_, i) => `[v${i}]`).join("")}concat=n=${blocks.length}:v=1:a=0,pad=ceil(iw/2)*2:ceil(ih/2)*2[v]`,
  ...audios,
  `${blocks.map((_, i) => `[a${i}]`).join("")}amix=inputs=${blocks.length}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11[a]`,
].join(";");
execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...inputs, "-filter_complex", graph, "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", "-t", at.toFixed(2), output], { stdio: "inherit" });
console.log(`videoaula: ${at.toFixed(1)}s → ${output}`);

import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// Monta uma aula do minicurso: cada trecho de tela dura exatamente a fala dele
// (acelerado se for mais longo, segurado no último quadro se for mais curto),
// com moldura, cartelas de abertura e fim, narração e legenda .srt.
// Usage: node scripts/minicurso-montar.mjs aula-01 [aula-02 ...]
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const data = JSON.parse(readFileSync(join(root, "docs", "minicurso", "roteiros.json"), "utf8"));
const W = 1920, H = 1080, TOP = 66, LEAD = 0.25, GAP = 0.45, OPEN = 3, END = 3.5;
const run = (args) => execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", ...args], { stdio: ["ignore", "ignore", "inherit"] });
const probe = (file) => Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8" }));
const srtTime = (t) => { const ms = Math.round(t * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, s = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`; };
// The app window goes under the top bar, scaled to fit, on the frame image.
const fit = (frame) => `[0:v]scale=w=${W - 80}:h=${H - TOP - 24}:force_original_aspect_ratio=decrease,setsar=1[app];[1:v][app]overlay=(W-w)/2:${TOP}+(H-${TOP}-h)/2,fps=30,format=yuv420p`;

for (const id of process.argv.slice(2)) {
  const lesson = data.lessons.find((l) => l.id === id);
  const dir = join(root, ".cache", "minicurso", id), work = join(dir, "montagem");
  rmSync(work, { recursive: true, force: true }); mkdirSync(work, { recursive: true });
  const voices = JSON.parse(readFileSync(join(dir, "voz.json"), "utf8"));
  const beats = JSON.parse(readFileSync(join(dir, "beats.json"), "utf8"));
  const segments = [], cues = [], audio = [];
  const still = (file, seconds, out) => run(["-loop", "1", "-t", seconds.toFixed(3), "-i", file, "-vf", `scale=${W}:${H},fps=30,format=yuv420p`, "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", out]);
  let at = 0;
  const open = join(work, "00-abertura.mp4"); still(join(dir, "abertura.png"), OPEN, open); segments.push(open); at += OPEN;
  lesson.beats.forEach((beat, i) => {
    const voice = voices.find((v) => v.id === beat.id), shot = beats.find((b) => b.id === beat.id);
    if (!voice || !shot) throw new Error(`${id}/${beat.id}: falta ${!voice ? "narração" : "gravação"}`);
    const target = LEAD + voice.seconds + GAP, out = join(work, `${String(i + 1).padStart(2, "0")}-${beat.id}.mp4`);
    if (shot.source === "image") still(shot.file, target, out);
    else {
      // Source footage for the beat: one range of a take, or several ranges of a clip.
      const ranges = shot.source === "rec" ? [[shot.start, shot.end]] : shot.ranges;
      const length = ranges.reduce((s, [a, b]) => s + (b - a), 0), speed = length / target;
      const trims = ranges.map(([a, b], k) => `[0:v]trim=${a}:${b},setpts=PTS-STARTPTS[r${k}]`).join(";");
      const joined = `${trims};${ranges.map((_, k) => `[r${k}]`).join("")}concat=n=${ranges.length}:v=1:a=0[src]`;
      const timed = speed > 1 ? `[src]setpts=PTS/${speed.toFixed(4)}[t]` : `[src]tpad=stop_mode=clone:stop_duration=${(target - length).toFixed(3)}[t]`;
      const frame = join(dir, speed > 1.6 ? "moldura-acelerado.png" : "moldura.png");
      run(["-i", shot.file, "-loop", "1", "-i", frame, "-filter_complex", `${joined};${timed};${fit().replace("[0:v]", "[t]")}`, "-t", target.toFixed(3), "-an", "-c:v", "libx264", "-preset", "veryfast", "-crf", "17", out]);
    }
    segments.push(out);
    audio.push({ file: voice.file, at: at + LEAD });
    // Legenda em blocos de até ~84 caracteres, no tempo proporcional ao texto.
    const words = voice.text.split(" "), chunks = [];
    for (const w of words) { const last = chunks.at(-1); if (last && (last + " " + w).length <= 84) chunks[chunks.length - 1] = `${last} ${w}`; else chunks.push(w); }
    let t = at + LEAD; const per = voice.seconds / voice.text.length;
    for (const c of chunks) { const d = (c.length + 1) * per; cues.push([t, t + d, c]); t += d; }
    at += target;
  });
  const end = join(work, "99-fim.mp4"); still(join(dir, "fim.png"), END, end); segments.push(end); at += END;
  writeFileSync(join(work, "lista.txt"), segments.map((s) => `file '${s.replace(/\\/g, "/")}'`).join("\n"));
  const video = join(work, "video.mp4");
  run(["-f", "concat", "-safe", "0", "-i", join(work, "lista.txt"), "-c", "copy", video]);
  const inputs = audio.flatMap((a) => ["-i", a.file]);
  const mix = audio.map((a, k) => `[${k + 1}:a]adelay=${Math.round(a.at * 1000)}|${Math.round(a.at * 1000)},aformat=channel_layouts=stereo[a${k}]`).join(";") + `;${audio.map((_, k) => `[a${k}]`).join("")}amix=inputs=${audio.length}:normalize=0,loudnorm=I=-16:TP=-1.5:LRA=11,apad[a]`;
  const outDir = join(root, ".cache", "minicurso", "final"); mkdirSync(outDir, { recursive: true });
  const name = `${String(lesson.number).padStart(2, "0")} - ${lesson.title.replace(/[:·]/g, "-").replace(/\s+/g, " ")}`;
  run(["-i", video, ...inputs, "-filter_complex", mix, "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "192k", "-t", at.toFixed(3), "-movflags", "+faststart", join(outDir, `${name}.mp4`)]);
  writeFileSync(join(outDir, `${name}.srt`), cues.map(([a, b, c], k) => `${k + 1}\n${srtTime(a)} --> ${srtTime(b)}\n${c}\n`).join("\n"));
  console.log(`${id}: ${at.toFixed(1)} s (${Math.floor(at / 60)}:${String(Math.floor(at % 60)).padStart(2, "0")}) → ${name}.mp4`);
}

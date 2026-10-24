"""Escreve o manifesto dos clipes do clone para o Remotion.

Uso: python scripts/reels-avatar-meta.py <pasta dos clipes> <saida avatar.json>
Para cada <beat>.mp4: duração, se tem áudio e onde a fala começa e termina (energia),
para a legenda seguir o áudio do próprio clipe.
"""
import array, json, math, os, subprocess, sys

RATE, HOP = 16000, 160  # 10 ms


def probe(path):
    out = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type:format=duration", "-of", "csv=p=0", path], capture_output=True, text=True, check=True).stdout
    return "audio" in out, float([l for l in out.split() if l.replace(".", "").isdigit()][-1])


def speech_span(path):
    raw = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", path, "-vn", "-ac", "1", "-ar", str(RATE), "-f", "s16le", "-"], capture_output=True, check=True).stdout
    data = array.array("h"); data.frombytes(raw)
    env = [math.sqrt(sum(x * x for x in data[i:i + HOP]) / HOP) for i in range(0, len(data) - HOP, HOP)]
    peak = max(env) or 1
    loud = [i for i, e in enumerate(env) if e / peak > 0.08]
    if not loud:
        return None
    return round(loud[0] / 100, 2), round((loud[-1] + 1) / 100, 2)


folder, out = sys.argv[1], sys.argv[2]
meta = json.load(open(out, encoding="utf8")) if os.path.exists(out) else {}
for name in sorted(os.listdir(folder)):
    if not name.startswith("cena-") or not name.endswith(".mp4"):
        continue
    path = os.path.join(folder, name)
    has_audio, duration = probe(path)
    entry = {"duration": round(duration, 2), "audio": has_audio}
    if has_audio:
        span = speech_span(path)
        if span:
            entry["speechStart"], entry["speechEnd"] = span
    meta[name[:-4]] = entry
json.dump(meta, open(out, "w", encoding="utf8"), indent=2)
print(json.dumps(meta, indent=1))

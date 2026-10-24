"""Mede a defasagem entre a fala do clipe gerado (áudio nativo do modelo) e a narração limpa.

Uso: python scripts/reels-avatar-offset.py <clipe.mp4> <narracao.mp3>
Imprime JSON {"offset": segundos, "score": correlação}. offset > 0 = a boca do clipe começa
depois do início da narração (o montador adianta o vídeo nesse tanto).
"""
import array, json, math, subprocess, sys, tempfile, os

RATE = 16000
HOP = 160  # 10 ms


def envelope(path):
    tmp = tempfile.mktemp(suffix=".raw")
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", path, "-vn", "-ac", "1", "-ar", str(RATE), "-f", "s16le", tmp], check=True)
    data = array.array("h")
    with open(tmp, "rb") as fh:
        data.frombytes(fh.read())
    os.remove(tmp)
    env = []
    for i in range(0, len(data) - HOP, HOP):
        seg = data[i:i + HOP]
        env.append(math.sqrt(sum(x * x for x in seg) / HOP))
    peak = max(env) or 1
    return [e / peak for e in env]


def best_offset(clip, voice, max_shift_s=3.0):
    a, b = envelope(clip), envelope(voice)
    n = min(len(a), len(b))
    best = (0, -1)
    for shift in range(-int(max_shift_s * 100), int(max_shift_s * 100) + 1):
        num = den_a = den_b = 0.0
        for i in range(n):
            j = i + shift
            if 0 <= j < len(a):
                num += a[j] * b[i]; den_a += a[j] ** 2; den_b += b[i] ** 2
        score = num / math.sqrt(den_a * den_b) if den_a and den_b else 0
        if score > best[1]:
            best = (shift, score)
    return best[0] / 100, best[1]


if __name__ == "__main__":
    offset, score = best_offset(sys.argv[1], sys.argv[2])
    print(json.dumps({"offset": round(offset, 2), "score": round(score, 3)}))

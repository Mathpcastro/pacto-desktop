"""Corta a gravação da aula 10 (postar, agendar, métricas, analytics, perfis e agentes; Composio falso,
nada publicado) nos vídeos curtos da landing /app v4, no mesmo formato da v3: tela inteira do app, zoom
suave onde a ação acontece, 9 a 16 s, 1280x836, sem som, H.264 com faststart e pôster JPG.
Uso: python scripts/landing-clips-v4.py [pasta-de-saída]"""
from pathlib import Path
import json, subprocess, sys

ROOT = Path(__file__).resolve().parent.parent
REC = ROOT / '.cache' / 'minicurso' / 'aula-10'
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(r'C:\Users\Admin2\Documents\Método Pacto\assets\app\v4')
OUT.mkdir(parents=True, exist_ok=True)
work = REC / 'clips'
work.mkdir(exist_ok=True)
beats = {b['id']: b for b in json.loads((REC / 'beats.json').read_text(encoding='utf-8')) if b.get('source') == 'rec'}
W, H = 1280, 836  # saída; a janela gravada tem 1440x940

def span(name, a=0, z=0): b = beats[name]; return (b['take'], b['start'] + a, b['end'] - z)
def head(name, n): b = beats[name]; return (b['take'], b['start'], min(b['end'], b['start'] + n))
def tail(name, n): b = beats[name]; return (b['take'], max(b['start'], b['end'] - n), b['end'])

# Áreas de zoom em coordenadas da janela gravada (x, y, largura); a altura segue a proporção da tela.
MODAL = (380, 330, 700)      # lista de contas no modal Conectar Instagram
POSTBOX = (290, 70, 870)     # carrossel e a caixa Instagram na etapa Publicar
METRICS = (290, 70, 870)     # carrossel e os números do Instagram no Resultado
PANEL = (180, 90, 1120)      # Analytics da conta
SWITCH = (20, 10, 960)       # seletor de perfil
AGENTS = (380, 40, 720)      # modal Use o Carrossell pelo seu agente

# nome: (trechos com zoom ou None, segundos totais)
CLIPS = {
    'instagram': ([(tail('conectar', 6), MODAL), (span('postar'), POSTBOX)], 15),
    'conectar': ([(span('conectar'), None)], 11),
    'postar': ([(span('postar'), POSTBOX)], 12),
    'agendar': ([(span('agendar', 3), POSTBOX)], 9),
    'metricas': ([(span('metricas'), METRICS)], 9),
    'analytics': ([(span('analytics'), PANEL)], 11),
    'perfis': ([(span('perfis'), SWITCH)], 12),
    'agentes': ([(span('agentes', 3), AGENTS)], 9),
}

def run(args): subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *args], check=True)

def zoom_filter(focus, length):
    """Enquadramento fixo na área da ação: recorta e amplia para a tela inteira.
    (O zoom animado da v3 prendia o recorte no canto esquerdo.)"""
    if not focus:
        return ''
    x, y, w = focus
    cw = round(W * w / 1440 / 2) * 2
    ch = round(cw * H / W / 2) * 2
    cx = min(W - cw, round(x * W / 1440))
    cy = min(H - ch, round(y * H / 940))
    return f',crop={cw}:{ch}:{cx}:{cy},scale={W}:{H}:flags=lanczos'

for name, (ranges, seconds) in CLIPS.items():
    total = sum(z - a for (_, a, z), _ in ranges)
    speed = max(1.0, total / seconds)
    parts = []
    for n, ((take, a, z), focus) in enumerate(ranges):
        part = work / f'{name}-{n:02d}.mp4'
        length = (z - a) / speed
        vf = f'scale={W}:{H}:flags=lanczos,setpts=(PTS-STARTPTS)/{speed:.4f},fps=30{zoom_filter(focus, length)}'
        run(['-ss', f'{a:.3f}', '-t', f'{z - a:.3f}', '-i', str(REC / f'take-{take}.mp4'), '-an', '-vf', vf, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '14', '-pix_fmt', 'yuv420p', str(part)])
        parts.append(part)
    listing = work / f'{name}.txt'
    listing.write_text('\n'.join(f"file '{p.as_posix()}'" for p in parts), encoding='utf-8')
    final = OUT / f'{name}.mp4'
    run(['-f', 'concat', '-safe', '0', '-i', str(listing), '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '27', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(final)])
    duration = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(final)], capture_output=True, text=True).stdout)
    at = {'instagram': 0.97, 'postar': 0.97, 'agendar': 0.85, 'metricas': 0.9, 'perfis': 0.45, 'conectar': 0.85}.get(name, 0.6)
    run(['-ss', f'{duration * at:.2f}', '-i', str(final), '-frames:v', '1', '-q:v', '4', str(OUT / f'{name}.jpg')])
    print(f'{name}: {duration:.1f}s, {speed:.1f}x, {final.stat().st_size // 1024} KB')

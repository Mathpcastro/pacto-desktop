"""Build outlined wordmarks from the existing Windows Segoe UI Bold font.

Only glyph outlines are exported, not the font file. The application continues
using its existing font stack; these paths belong to the logo artwork.
"""
import json
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

root = Path(__file__).resolve().parents[1]
font = TTFont(r'C:\Windows\Fonts\segoeuib.ttf')
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
x = 0
paths = []
for letter in 'carrossell':
    name = cmap[ord(letter)]
    pen = SVGPathPen(glyphs)
    glyphs[name].draw(pen)
    paths.append(f'<path transform="translate({x} 0)" d="{pen.getCommands()}"/>')
    x += font['hmtx'][name][0] - 32
out = root / 'resources' / 'branding'
out.mkdir(parents=True, exist_ok=True)
(out / 'wordmark-outlines.json').write_text(json.dumps({'units': font['head'].unitsPerEm, 'width': x + 32, 'paths': ''.join(paths)}, indent=2), encoding='utf-8')
print('Outlined logo wordmark generated; no font file distributed.')

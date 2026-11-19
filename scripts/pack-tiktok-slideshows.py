"""Monta o ZIP dos slideshows virais do TikTok para a Biblioteca do Carrossell (precisa de Pillow).

Entrada: a pasta da coleta (cutroom/research/tiktok_slideshows), com data/slideshows.json e images/.
Saída: um ZIP no mesmo formato do Swipe File (manifest, references, checksums e assets em WebP),
com id "tiktok-slideshows". O app instala ao lado das 500 referências do Instagram.

Uso: python scripts/pack-tiktok-slideshows.py <pasta-da-coleta> <saida.zip> [--versao N]
"""
import argparse
from collections import Counter
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
import re
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED, ZIP_STORED

from PIL import Image, ImageOps

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("source", type=Path)
parser.add_argument("output", type=Path)
parser.add_argument("--versao", type=int, default=1)
args = parser.parse_args()
root = args.source.resolve()
rows = json.loads((root / "data/slideshows.json").read_text(encoding="utf-8"))
rows = [row for row in rows if row.get("images")]
# Texto da capa lido pelo OCR do Windows (ocr.ps1 na pasta da coleta): vira o título da referência.
ocr_file = root / "data/ocr-capas.json"
OCR = json.loads(ocr_file.read_text(encoding="utf-8-sig")) if ocr_file.exists() else {}
assert rows and len(rows) == len({row["id"] for row in rows}) and len(rows) <= 1000

# Nicho pela busca que encontrou o post (as buscas da coleta são por tipo de app).
NICHES = [
    ("estudos", r"stud|estud|learn|language|aprend"),
    ("produtividade", r"productiv|produtiv|focus|note|habit|journal"),
    ("financas", r"financ|budget|finanz"),
    ("fitness", r"fitness|workout|treino|gym|meal"),
    ("bem_estar", r"meditat|sleep|self improvement|mental"),
    ("beleza", r"skincare|beauty|photo editing"),
    ("negocios", r"business|negócio"),
]
def niche(row):
    query = (row.get("query") or "").lower()
    return next((name for name, pattern in NICHES if re.search(pattern, query)), "apps")

def compact(n):
    if n is None:
        return ""
    return f"{n / 1e6:.1f} mi".replace(".", ",") if n >= 1_000_000 else f"{round(n / 1e3)} mil" if n >= 1000 else str(n)

def webp(path, size, quality):
    path = (root / path).resolve()
    if not path.is_relative_to(root):
        raise ValueError(f"Imagem fora da coleta: {path}")
    with Image.open(path) as original, BytesIO() as output:
        image = ImageOps.exif_transpose(original).convert("RGB")
        image.thumbnail(size, Image.Resampling.LANCZOS)  # o app aceita até 1400 px de lado
        image.save(output, "WEBP", quality=quality, method=4)
        return output.getvalue()

def encode(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode()

args.output.parent.mkdir(parents=True, exist_ok=True)
temporary = args.output.with_suffix(".partial")
checks, references = {}, []
try:
    with ZipFile(temporary, "w") as archive:
        def add(name, data, compression=ZIP_DEFLATED):
            archive.writestr(ZipInfo(name, (2026, 11, 19, 0, 0, 0)), data, compress_type=compression)
            checks[name] = {"size": len(data), "sha256": sha256(data).hexdigest()}

        for row in sorted(rows, key=lambda r: -(r.get("views") or 0)):
            key = f"TT-{row['id']}"
            images = [f"images/{name}" for name in row["images"][:20]]
            add(f"assets/{key}-thumb.webp", webp(images[0], (360, 640), 76), ZIP_STORED)
            names = []
            for index, path in enumerate(images, 1):
                name = f"{key}-{index:03}.webp"
                add(f"assets/{name}", webp(path, (760, 1350), 78), ZIP_STORED)
                names.append(name)
            caption = (row.get("text") or "").strip()
            cover = re.sub(r"\s+", " ", OCR.get(str(row["id"])) or "").strip()
            hook = cover or re.sub(r"\s*#\S+", "", caption).strip() or f"Slideshow de @{row.get('author') or 'autor'}"
            if cover:
                caption = f"Texto da capa: {cover}\n\n{caption}"
            metrics = " · ".join(part for part in [
                f"{compact(row.get('views'))} views" if row.get("views") is not None else "",
                f"{compact(row.get('saves'))} salvos" if row.get("saves") is not None else "",
                f"{compact(row.get('likes'))} curtidas" if row.get("likes") is not None else "",
                f"{compact(row.get('shares'))} compartilhamentos" if row.get("shares") is not None else "",
            ] if part)
            references.append({
                "id": key, "author": f"@{row.get('author') or 'autor'}"[:160], "hook": hook[:500],
                "niche": niche(row), "language": (row.get("language") or "un")[:20], "platform": "tiktok",
                "url": row["url"], "caption": caption[:6000], "metricText": metrics[:600],
                "likes": row.get("likes"), "comments": row.get("comments"), "views": row.get("views"),
                "saves": row.get("saves"), "shares": row.get("shares"),
                "coverage": "full_slides", "evidence": "metrics_text_only", "slides": names,
            })

        add("manifest.json", encode({
            "format": "carrossell-swipe-file", "schema": 1, "id": "tiktok-slideshows",
            "title": f"Slideshows virais do TikTok · {len(references)}", "version": args.versao, "count": len(references),
        }))
        add("references.json", encode(references))
        add("checksums.json", encode(checks))
    temporary.replace(args.output)
finally:
    temporary.unlink(missing_ok=True)

print(json.dumps({
    "output": str(args.output), "bytes": args.output.stat().st_size, "references": len(references),
    "slides": sum(len(r["slides"]) for r in references), "niches": Counter(r["niche"] for r in references),
}, ensure_ascii=False))

"""Build the Carrossell swipe file from the local Kimi collection (requires Pillow)."""
import argparse
from collections import Counter
from hashlib import sha256
from io import BytesIO
import json
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_DEFLATED, ZIP_STORED

from PIL import Image, ImageOps

parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("source", type=Path)
parser.add_argument("output", type=Path)
args = parser.parse_args()
root = args.source.resolve()
rows = json.loads((root / "data/acervo_principal_500.json").read_text(encoding="utf-8-sig"))
assert len(rows) == len({row["id"] for row in rows}) == 500

def encode(value):
    return json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode()

def webp(relative, size, quality):
    path = (root / relative).resolve()
    if not path.is_relative_to(root):
        raise ValueError(f"Asset outside collection: {relative}")
    with Image.open(path) as original, BytesIO() as output:
        image = ImageOps.exif_transpose(original).convert("RGB")
        image.thumbnail(size, Image.Resampling.LANCZOS)
        image.save(output, "WEBP", quality=quality, method=4)
        return output.getvalue()

args.output.parent.mkdir(parents=True, exist_ok=True)
temporary = args.output.with_suffix(".partial")
checks = {}
references = []
try:
    with ZipFile(temporary, "w") as archive:
        def add(name, data, compression=ZIP_DEFLATED):
            archive.writestr(ZipInfo(name, (2026, 11, 16, 0, 0, 0)), data, compress_type=compression)
            checks[name] = {"size": len(data), "sha256": sha256(data).hexdigest()}

        for row in rows:
            key = row["id"]
            paths = row.get("local_slide_paths", [])
            names = []
            if paths:
                add(f"assets/{key}-thumb.webp", webp(paths[0], (360, 450), 76), ZIP_STORED)
            for index, path in enumerate(paths, 1):
                name = f"{key}-{index:03}.webp"
                add(f"assets/{name}", webp(path, (900, 1100), 78), ZIP_STORED)
                names.append(name)
            proof = row.get("engagement_screenshot")
            if proof:
                add(f"assets/{key}-proof.webp", webp(proof, (950, 1400), 82), ZIP_STORED)
            references.append({
                "id": key, "author": (row.get("author") or "Autor não identificado")[:160],
                "hook": (row.get("title_hook") or row.get("author") or key).strip()[:500],
                "niche": row["niche"], "language": row["language"], "platform": row["platform"],
                "url": row["url"], "caption": (row.get("caption") or "")[:6000],
                "likes": row.get("likes"), "comments": row.get("comments"),
                "metricText": (row.get("engagement_text_raw") or "")[:600],
                "coverage": row["visual_collection_status"], "evidence": row["engagement_evidence_type"],
                "slides": names,
            })

        add("manifest.json", encode({
            "format": "carrossell-swipe-file", "schema": 1, "id": "kimi-500",
            "title": "Swipe File · 500 referências", "version": 1, "count": len(references),
        }))
        add("references.json", encode(references))
        add("checksums.json", encode(checks))
    temporary.replace(args.output)
finally:
    temporary.unlink(missing_ok=True)

print(json.dumps({
    "output": str(args.output), "bytes": args.output.stat().st_size,
    "references": len(references), "slides": sum(len(row["slides"]) for row in references),
    "coverage": Counter(row["coverage"] for row in references),
    "evidence": Counter(row["evidence"] for row in references),
}, ensure_ascii=False))

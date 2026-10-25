"""Generate only committed synthetic cases; never rewrite or upload real applicant documents."""
import argparse
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfgen import canvas

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--font", type=Path, required=True, help="A local TrueType font with Korean glyphs")
    parser.add_argument("--output", type=Path, default=ROOT / "output/applicant-fields-quality/pdfs")
    args = parser.parse_args()
    cases = json.loads((ROOT / "tests/fixtures/applicant-quality.json").read_text())
    if cases.get("syntheticOnly") is not True:
        raise ValueError("SYNTHETIC_FIXTURES_REQUIRED")
    args.output.mkdir(parents=True, exist_ok=True)
    pdfmetrics.registerFont(TTFont("QualityKorean", str(args.font)))
    manifest = {"fixtureSha256": hashlib.sha256((ROOT / "tests/fixtures/applicant-quality.json").read_bytes()).hexdigest(),
                "syntheticOnly": True, "files": {}}
    for case in cases["cases"]:
        path = args.output / (case["id"] + ".pdf")
        document = canvas.Canvas(str(path), pagesize=(595, 842))
        document.setTitle(case["title"])
        for page_number, lines in enumerate(case["pages"], 1):
            if case["layout"] == "scanned":
                image = Image.new("RGB", (1190, 1684), "white")
                draw = ImageDraw.Draw(image)
                font = ImageFont.truetype(str(args.font), 27)
                for index, line in enumerate(lines):
                    draw.text((90, 100 + index * 75), line, font=font, fill="#152039")
                image_path = args.output / (case["id"] + ".png")
                image.save(image_path)
                document.drawImage(str(image_path), 0, 0, width=595, height=842)
            else:
                document.setFillColorRGB(.08, .12, .23)
                document.setFont("QualityKorean", 16)
                document.drawString(42, 788, case["title"])
                document.setFont("QualityKorean", 10)
                for index, line in enumerate(lines):
                    if case["layout"] == "columns" and index > 0:
                        column, row = (0, index - 1) if index < 5 else (1, index - 5)
                        x, y = 42 + column * 275, 702 - row * 48
                    else:
                        x, y = 42, 740 - index * 36
                    document.drawString(x, y, line)
                document.setFont("QualityKorean", 9)
                document.drawString(42, 38, f"SYNTHETIC ONLY | {case['id']} | {page_number}/{len(case['pages'])}")
            document.showPage()
        document.save()
        manifest["files"][case["id"]] = hashlib.sha256(path.read_bytes()).hexdigest()
        print(path)
    (args.output / "synthetic-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    main()

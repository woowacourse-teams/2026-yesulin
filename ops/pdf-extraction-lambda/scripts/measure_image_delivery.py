"""Measure extracted-photo bytes for a 300-applicant review with synthetic PDFs only.

The same command runs before and after an image change so the two summaries can be compared.
Photos come from the repository's demo applicant images; real applicant documents are never used.
"""
import argparse
import ctypes
import io
import json
import shutil
import statistics
import sys
import time
from pathlib import Path

import pypdfium2 as pdfium
import pypdfium2.raw as raw
import PIL
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[1]
sys.path.insert(0, str(ROOT / "src"))

from application.extraction import PIPELINE_VERSION, Limits, extract_pdf  # noqa: E402

PHOTOS = ["kim-harin-acting-1.png", "kim-harin-extra-1.jpg", "kim-harin-full-body.png",
          "kim-harin-acting-2.png", "kim-harin-extra-2.jpg", "kim-harin-extra-3.jpg"]
# Placed photo boxes in PDF points (width, height): one main portrait, then smaller extras.
BOXES = [(200, 260), (150, 200), (150, 200)]
LINE = "Name Kim Harin | Age 27 | Height 168 | Education Seoul Arts | Career 2024 Musical Ensemble"


def jpeg_bytes(name):
    with Image.open(REPO / "frontend/public/images/applicants" / name) as image:
        buffer = io.BytesIO()
        image.convert("RGB").save(buffer, format="JPEG", quality=90)
        return buffer.getvalue()


def add_text(document, page, lines):
    for index, line in enumerate(lines):
        obj = raw.FPDFPageObj_NewTextObj(document.raw, b"Helvetica", ctypes.c_float(9))
        encoded = (line + "\0").encode("utf-16-le")
        buffer = ctypes.create_string_buffer(encoded, len(encoded))
        raw.FPDFText_SetText(obj, ctypes.cast(buffer, raw.FPDF_WIDESTRING))
        raw.FPDFPageObj_Transform(obj, 1, 0, 0, 1, 40, 800 - index * 14)
        raw.FPDFPage_InsertObject(page.raw, obj)


def make_pdf(path, photo_count, offset, cache):
    """Return the bytes of the photos embedded as JPEG, the form an applicant's word processor usually writes."""
    embedded = 0
    document = pdfium.PdfDocument.new()
    try:
        first = document.new_page(595, 842)
        add_text(document, first, [LINE] * 20)
        for slot in range(photo_count):
            name = PHOTOS[(offset + slot) % len(PHOTOS)]
            image = pdfium.PdfImage.new(document)
            if name not in cache:
                cache[name] = jpeg_bytes(name)
            data = cache[name]
            embedded += len(data)
            image.load_jpeg(io.BytesIO(data), inline=False)
            width, height = BOXES[slot]
            x = 360 if slot == 0 else 40 + (slot - 1) * 170
            y = 520 if slot == 0 else 60
            image.set_matrix(pdfium.PdfMatrix().scale(width, height).translate(x, y))
            first.insert_obj(image)
        first.gen_content()
        second = document.new_page(595, 842)
        add_text(document, second, [LINE] * 40)
        second.gen_content()
        document.save(str(path))
    finally:
        document.close()
    return embedded


def api_body_bytes(result, url_bytes):
    """Approximate the Spring includeResult body: page text plus signed image URLs, without text regions."""
    pages = [{"number": page["number"], "text": page["text"], "needsOcr": page["needsOcr"],
              "images": [{"fileKey": "k" * 120, "url": "u" * url_bytes, "classification": image.get("classification")}
                         for image in page["images"] if image.get("status") == "EXTRACTED"]}
             for page in result["pages"]]
    body = {"status": result["status"], "pages": pages, "applicantInfo": {"profile": "x" * 1500}}
    return len(json.dumps(body, ensure_ascii=False).encode("utf-8")) + 600


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--count", type=int, default=300)
    parser.add_argument("--photos", default="1,2,3", help="Photos per PDF (1-3 each), cycled across applicants")
    parser.add_argument("--signed-url-bytes", type=int, default=1300,
                        help="Assumed length of one presigned S3 GET URL with a session token")
    parser.add_argument("--label", default="baseline")
    parser.add_argument("--output", type=Path, default=ROOT / "output/image-delivery")
    args = parser.parse_args()
    counts = [int(value) for value in args.photos.split(",")]
    if any(count < 1 or count > len(BOXES) for count in counts):
        parser.error(f"--photos values must be between 1 and {len(BOXES)}")
    work = args.output / args.label
    shutil.rmtree(work, ignore_errors=True)
    (work / "pdfs").mkdir(parents=True)
    cache, rows = {}, []
    for index in range(args.count):
        pdf = work / "pdfs" / f"applicant-{index + 1:03d}.pdf"
        embedded = make_pdf(pdf, counts[index % len(counts)], index, cache)
        assets = work / "assets" / pdf.stem
        started = time.perf_counter()
        # Same options as the S3-triggered production path (s3_handler.py): images on, text regions off.
        result = extract_pdf(pdf, assets, limits=Limits(), include_regions=False)
        elapsed = (time.perf_counter() - started) * 1000
        images = [image for page in result["pages"] for image in page["images"] if image.get("status") == "EXTRACTED"]
        candidates = [image for image in images if image["classification"] == "CANDIDATE"]
        rows.append({"pdfBytes": pdf.stat().st_size, "embeddedJpegBytes": embedded, "extractMs": elapsed, "images": len(images),
                     "candidates": len(candidates), "imageBytes": sum(image["sizeBytes"] for image in images),
                     "firstCandidateBytes": candidates[0]["sizeBytes"] if candidates else 0,
                     "candidateBytes": sum(image["sizeBytes"] for image in candidates),
                     "maxEdge": max((max(image["pixelWidth"], image["pixelHeight"]) for image in images), default=0),
                     "resultJsonBytes": len(json.dumps(result, ensure_ascii=False).encode("utf-8")),
                     "apiBodyBytes": api_body_bytes(result, args.signed_url_bytes)})
    mib = 1024 * 1024
    total_images = sum(row["images"] for row in rows)
    summary = {
        "label": args.label, "pipelineVersion": PIPELINE_VERSION, "engineVersion": str(pdfium.PYPDFIUM_INFO),
        "pillowVersion": PIL.__version__,
        "applicants": args.count, "photosPerPdf": counts, "signedUrlBytesAssumed": args.signed_url_bytes,
        "pdfUploadMiB": round(sum(row["pdfBytes"] for row in rows) / mib, 1),
        "extractedImages": total_images,
        "candidateImages": sum(row["candidates"] for row in rows),
        "avgImageKiB": round(sum(row["imageBytes"] for row in rows) / max(total_images, 1) / 1024),
        "maxImageEdgePx": max(row["maxEdge"] for row in rows),
        "embeddedJpegMiB": round(sum(row["embeddedJpegBytes"] for row in rows) / mib, 1),
        "storedImageMiB": round(sum(row["imageBytes"] for row in rows) / mib, 1),
        "extractMsMedian": round(statistics.median(row["extractMs"] for row in rows)),
        "extractMsP95": round(sorted(row["extractMs"] for row in rows)[int(len(rows) * .95) - 1]),
        # One board mount (card or table view) fetches every applicant result, then each card's first photo.
        "boardJsonRequests": args.count,
        "boardJsonMiB": round(sum(row["apiBodyBytes"] for row in rows) / mib, 2),
        "boardPhotoRequests": sum(1 for row in rows if row["firstCandidateBytes"]),
        "boardPhotoMiB": round(sum(row["firstCandidateBytes"] for row in rows) / mib, 1),
        # Opening every applicant once in single review loads all candidate photos.
        "allCandidatePhotosMiB": round(sum(row["candidateBytes"] for row in rows) / mib, 1),
    }
    summary["boardTotalMiB"] = round(summary["boardJsonMiB"] + summary["boardPhotoMiB"], 1)
    (work / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    (work / "rows.json").write_text(json.dumps(rows, indent=2) + "\n")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()

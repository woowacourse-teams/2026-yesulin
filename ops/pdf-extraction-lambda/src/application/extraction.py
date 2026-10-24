"""Bounded PDF text/image extraction. No OCR, LLM, portrait classification or page renders."""
import ctypes
import hashlib
import math
import time
from dataclasses import dataclass
from pathlib import Path

import pypdfium2 as pdfium
from pypdfium2 import raw

PIPELINE_VERSION = "pdfium-v1"


class ExtractionError(Exception):
    """Safe machine-readable error, with no document contents in its message."""


@dataclass(frozen=True)
class Limits:
    max_file_bytes: int = 25 * 1024 * 1024
    max_pages: int = 50
    max_image_pixels: int = 20_000_000
    max_images: int = 100
    image_max_edge: int = 1600
    max_page_characters: int = 100_000
    max_regions_per_page: int = 2000
    max_asset_bytes: int = 40 * 1024 * 1024


def normalized_box(page, box):
    width, height = page.get_size()
    points = []
    for x, y in ((box[0], box[1]), (box[0], box[3]), (box[2], box[1]), (box[2], box[3])):
        dx, dy = ctypes.c_int(), ctypes.c_int()
        if not raw.FPDF_PageToDevice(page.raw, 0, 0, round(width * 10), round(height * 10),
                                     0, x, y, ctypes.byref(dx), ctypes.byref(dy)):
            raise ExtractionError("COORDINATE_CONVERSION_FAILED")
        points.append((dx.value / (10 * width), dy.value / (10 * height)))
    return [round(max(0, min(1, value)), 6) for value in (
        min(p[0] for p in points), min(p[1] for p in points),
        max(p[0] for p in points), max(p[1] for p in points))]


def write_image(obj, path, limits):
    """Bound output raster dimensions before rendering, preserving PDF masks/transforms."""
    px_width, px_height = obj.get_px_size()
    if px_width <= 0 or px_height <= 0 or px_width * px_height > limits.max_image_pixels:
        raise ExtractionError("IMAGE_PIXEL_LIMIT_EXCEEDED")
    left, bottom, right, top = obj.get_bounds()
    width, height = abs(right - left), abs(top - bottom)
    if not all(math.isfinite(v) and v > 0 for v in (width, height)):
        raise ExtractionError("INVALID_IMAGE_BOUNDS")
    scale = min(max(px_width / width, px_height / height), limits.image_max_edge / max(width, height))
    matrix = obj.get_matrix()
    try:
        obj.set_matrix(matrix.scale(scale, scale))
        bitmap = obj.get_bitmap(render=True, scale_to_original=False)
    finally:
        obj.set_matrix(matrix)
    try:
        image = bitmap.to_pil()
        try:
            image.save(path, format="PNG", optimize=False)
            with path.open("rb") as stream:
                digest = hashlib.file_digest(stream, "sha256").hexdigest()
            return {"originalWidth": px_width, "originalHeight": px_height,
                    "pixelWidth": image.width, "pixelHeight": image.height,
                    "sizeBytes": path.stat().st_size,
                    "sha256": digest}
        finally:
            image.close()
    finally:
        # The PIL wrapper has been closed above; no external bitmap view remains in use.
        bitmap.warn_on_close = False
        bitmap.close()


def extract_pdf(source, output, *, limits=None, extract_images=True, include_regions=True, remaining_ms=None):
    limits = limits or Limits()
    source, output = Path(source), Path(output)
    if source.stat().st_size > limits.max_file_bytes:
        raise ExtractionError("FILE_SIZE_LIMIT_EXCEEDED")
    with source.open("rb") as stream:
        if not stream.read(1024).lstrip().startswith(b"%PDF-"):
            raise ExtractionError("INVALID_PDF_SIGNATURE")
    output.mkdir(parents=True, exist_ok=True)
    started = time.perf_counter()
    pages, warnings = [], []
    image_count, asset_bytes = 0, 0
    try:
        document = pdfium.PdfDocument(source)
    except pdfium.PdfiumError:
        raise ExtractionError("PDF_OPEN_FAILED") from None
    try:
        if len(document) > limits.max_pages:
            raise ExtractionError("PAGE_LIMIT_EXCEEDED")
        for index in range(len(document)):
            if remaining_ms is not None and remaining_ms() < 15_000:
                raise ExtractionError("PROCESSING_TIME_LIMIT_APPROACHING")
            page = document[index]
            try:
                width, height = page.get_size()
                textpage = page.get_textpage()
                try:
                    char_count = textpage.count_chars()
                    text = textpage.get_text_range(0, min(char_count, limits.max_page_characters))
                    regions = []
                    if include_regions:
                        region_count = textpage.count_rects()
                        for region_index in range(min(region_count, limits.max_regions_per_page)):
                            box = textpage.get_rect(region_index)
                            regions.append({"text": textpage.get_text_bounded(*box),
                                            "bbox": normalized_box(page, box)})
                        if region_count > limits.max_regions_per_page:
                            warnings.append({"code": "TEXT_REGIONS_TRUNCATED", "page": index + 1})
                finally:
                    textpage.close()
                if char_count > limits.max_page_characters:
                    warnings.append({"code": "PAGE_TEXT_TRUNCATED", "page": index + 1})
                images = []
                if extract_images:
                    for obj in page.get_objects(filter=[raw.FPDF_PAGEOBJ_IMAGE], max_depth=15):
                        if remaining_ms is not None and remaining_ms() < 15_000:
                            raise ExtractionError("PROCESSING_TIME_LIMIT_APPROACHING")
                        if image_count >= limits.max_images:
                            warnings.append({"code": "IMAGE_COUNT_LIMIT_EXCEEDED", "page": index + 1})
                            break
                        image_count += 1
                        name = f"page-{index + 1:03d}-image-{image_count:03d}.png"
                        metadata = {"number": image_count, "status": "EXTRACTED", "fileName": name,
                                    "classification": "UNCLASSIFIED", "nestedFormDepth": obj.level}
                        path = output / name
                        try:
                            if asset_bytes >= limits.max_asset_bytes:
                                raise ExtractionError("ASSET_SIZE_LIMIT_EXCEEDED")
                            metadata.update(write_image(obj, path, limits))
                            asset_bytes += metadata["sizeBytes"]
                            if asset_bytes > limits.max_asset_bytes:
                                path.unlink(missing_ok=True)
                                raise ExtractionError("ASSET_SIZE_LIMIT_EXCEEDED")
                            metadata["bbox"] = None if obj.level else normalized_box(page, obj.get_bounds())
                        except (ExtractionError, pdfium.PdfiumError, ValueError, OSError) as error:
                            path.unlink(missing_ok=True)
                            code = str(error) if isinstance(error, ExtractionError) else "IMAGE_EXTRACTION_FAILED"
                            metadata = {"number": image_count, "status": "SKIPPED", "reason": code}
                            warnings.append({"code": code, "page": index + 1, "image": image_count})
                        images.append(metadata)
                pages.append({"number": index + 1, "width": width, "height": height,
                              "rotation": page.get_rotation(), "text": text, "regions": regions,
                              "textTruncated": char_count > limits.max_page_characters,
                              "needsOcr": not text.strip(), "images": images})
            finally:
                page.close()
    finally:
        document.close()
    return {"schemaVersion": 1, "pipelineVersion": PIPELINE_VERSION,
            "engine": "pypdfium2", "engineVersion": str(pdfium.PYPDFIUM_INFO),
            "status": "PARTIAL" if warnings else "COMPLETED", "pageCount": len(pages),
            "pages": pages, "warnings": warnings, "ocrPerformed": False,
            "imageClassificationPerformed": False,
            "coordinateSpace": "normalized 0..1, top-left of displayed page; null for nested Form images",
            "durationMs": round((time.perf_counter() - started) * 1000)}

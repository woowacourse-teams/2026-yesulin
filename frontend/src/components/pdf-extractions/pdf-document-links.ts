import type { PDFPageProxy } from "pdfjs-dist";
export type DocumentLink = { readonly url: string; readonly left: number; readonly top: number; readonly width: number; readonly height: number; readonly kind: "link" | "qr" };
export function safeDocumentUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}
export function documentLink(url: unknown, rect: readonly number[], width: number, height: number, kind: DocumentLink["kind"]): DocumentLink | null {
  const safe = safeDocumentUrl(url);
  if (!safe || rect.length !== 4 || !rect.every(Number.isFinite) || width <= 0 || height <= 0) return null;
  const left = Math.max(0, Math.min(rect[0], rect[2]) / width);
  const top = Math.max(0, Math.min(rect[1], rect[3]) / height);
  const right = Math.min(1, Math.max(rect[0], rect[2]) / width);
  const bottom = Math.min(1, Math.max(rect[1], rect[3]) / height);
  if (right <= left || bottom <= top) return null;
  return { url: safe, left, top, width: right - left, height: bottom - top, kind };
}
export async function embeddedDocumentLinks(page: PDFPageProxy): Promise<DocumentLink[]> {
  const viewport = page.getViewport({ scale: 1 });
  const annotations = await page.getAnnotations({ intent: "display" });
  return annotations.flatMap(annotation => {
    if (annotation.subtype !== "Link" || !Array.isArray(annotation.rect)) return [];
    const [x1, y1, x2, y2] = annotation.rect;
    const rect = [...viewport.convertToViewportPoint(x1, y1), ...viewport.convertToViewportPoint(x2, y2)];
    const link = documentLink(annotation.url, rect, viewport.width, viewport.height, "link");
    if (!link) return [];
    return [link];
  });
}

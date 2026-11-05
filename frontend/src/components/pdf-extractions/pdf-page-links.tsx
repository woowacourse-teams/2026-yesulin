"use client";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist";
import { embeddedDocumentLinks, type DocumentLink } from "./pdf-document-links";
import { PdfQrDecoder } from "./pdf-qr-decoder";
import { PdfRenderQueue } from "./pdf-render-queue";
import styles from "./pdf-viewer.module.css";
export function PdfPageLinks({ document, page, visible, queue, scanQueue, decoder }: {
  readonly document: PDFDocumentProxy; readonly page: number; readonly visible: boolean;
  readonly queue: PdfRenderQueue; readonly scanQueue: PdfRenderQueue; readonly decoder: PdfQrDecoder;
}) {
  const [known, setKnown] = useState<{ document: PDFDocumentProxy; links: DocumentLink[]; scanned: boolean } | null>(null);
  const scanned = useRef<PDFDocumentProxy | null>(null);
  useEffect(() => {
    if (!visible || scanned.current === document) return;
    let active = true; let task: RenderTask | undefined; let original: PDFPageProxy | undefined;
    const canvas = window.document.createElement("canvas");
    const controller = new AbortController();
    const timer = setTimeout(() => { void scanQueue.enqueue(async () => {
      const pixels = await queue.enqueue(async () => {
        if (!active) return null;
        original = await document.getPage(page);
        const embedded = await embeddedDocumentLinks(original).catch(() => []);
        if (!active) return null;
        setKnown({ document, links: embedded, scanned: false });
        const base = original.getViewport({ scale: 1 });
        const scale = Math.min(3000 / Math.max(base.width, base.height), Math.sqrt(8_000_000 / (base.width * base.height)));
        const viewport = original.getViewport({ scale });
        canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
        task = original.render({ canvas, viewport }); await task.promise;
        if (!active) return null;
        const image = canvas.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, canvas.width, canvas.height);
        canvas.width = 0; canvas.height = 0;
        return image;
      });
      if (!active || !pixels) return;
      const qr = await decoder.decode(pixels, controller.signal);
      if (active) {
        scanned.current = document;
        setKnown(current => ({ document, links: [...current?.links ?? [], ...qr], scanned: true }));
      }
    }).catch(() => {}).finally(() => { canvas.width = 0; canvas.height = 0; }); }, 0);
    return () => { active = false; clearTimeout(timer); controller.abort(); task?.cancel(); canvas.width = 0; canvas.height = 0; };
  }, [document, page, visible, queue, scanQueue, decoder]);
  if (known?.document !== document || !visible) return null;
  const labels = { qr: "QR 링크", link: "문서 링크" };
  return known.links.map((link, index) => <a key={`${index}:${link.url}`} href={link.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className={styles.documentLink} aria-label={`${labels[link.kind]} 열기: ${new URL(link.url).hostname}`} title={link.url} style={{ left: `${link.left * 100}%`, top: `${link.top * 100}%`, width: `${link.width * 100}%`, height: `${link.height * 100}%` }} />);
}

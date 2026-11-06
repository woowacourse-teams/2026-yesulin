"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist";
import { reportPdfError } from "@/features/pdf-extractions/report-pdf-error";
import { PdfQrDecoder } from "./pdf-qr-decoder";
import { PdfRenderQueue } from "./pdf-render-queue";
import { PdfScrollPage, type PdfPageSize } from "./pdf-scroll-page";
import styles from "./pdf-viewer.module.css";

export function PdfCanvasViewer({ url, filename, onRetry }: { readonly url: string; readonly filename: string; readonly onRetry?: () => void }) {
  const reader = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState<{ url: string; document: PDFDocumentProxy; pages: PdfPageSize[] } | null>(null);
  const [view, setView] = useState({ width: 0, zoom: 1, revision: 0 });
  const [failure, setFailure] = useState("");
  const [decoder] = useState(() => new PdfQrDecoder(() => new Worker(new URL("./pdf-qr.worker.ts", import.meta.url), { type: "module" })));
  useEffect(() => decoder.dispose, [decoder]);
  const [queue] = useState(() => new PdfRenderQueue());
  const [scanQueue] = useState(() => new PdfRenderQueue());
  const zoomRef = useRef(1);
  const anchor = useRef<{ zoom: number; left: number; top: number; x: number; y: number } | null>(null);
  useEffect(() => {
    let active = true;
    let loading: PDFDocumentLoadingTask | undefined;
    void import("pdfjs-dist").then(async pdfjs => {
      if (!active) return;
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      const assets = `/pdfjs/${pdfjs.version}/`;
      loading = pdfjs.getDocument({ url, withCredentials: false, enableXfa: false, cMapUrl: `${assets}cmaps/`, cMapPacked: true,
        standardFontDataUrl: `${assets}standard_fonts/`, wasmUrl: `${assets}wasm/`, iccUrl: `${assets}iccs/`, maxImageSize: -1, canvasMaxAreaInBytes: 32 * 1024 * 1024 });
      const document = await loading.promise;
      const pages: PdfPageSize[] = Array.from({ length: document.numPages }, () => ({ width: 595, height: 842 }));
      if (!active) return;
      setLoaded({ url, document, pages });
      for (let page = 1; page <= document.numPages; page++) {
        void document.getPage(page).then(original => {
          if (!active) return;
          const size = original.getViewport({ scale: 1 });
          setLoaded(current => {
            if (current?.document !== document) return current;
            const next = [...current.pages]; next[page - 1] = { width: size.width, height: size.height };
            return { ...current, pages: next };
          });
        }).catch(() => {});
      }
    }).catch(cause => { if (active) { reportPdfError(cause, "load_document"); setFailure(url); } });
    return () => { active = false; if (loading) void loading.destroy().catch(() => {}); };
  }, [url]);
  useEffect(() => {
    const target = reader.current;
    if (!target) return;
    const observer = new ResizeObserver(entries => {
      const width = Math.floor(entries[0].contentRect.width);
      setView(current => { if (current.width === width) return current; return { ...current, width, revision: current.revision + 1 }; });
    });
    observer.observe(target); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const target = reader.current;
    if (!target) return;
    const wheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = target.getBoundingClientRect();
      anchor.current = { zoom: zoomRef.current, left: target.scrollLeft, top: target.scrollTop, x: event.clientX - rect.left, y: event.clientY - rect.top };
      const factor = Math.exp(-Math.max(-100, Math.min(100, event.deltaY)) * .005);
      setView(current => { const zoom = Math.max(.5, Math.min(3, current.zoom * factor)); if (zoom === current.zoom) return current; return { ...current, zoom, revision: current.revision + 1 }; });
    };
    const keyboard = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      if (!["+", "=", "-", "0"].includes(event.key)) return;
      event.preventDefault();
      setView(current => {
        let zoom = current.zoom * 1.2;
        if (event.key === "-") zoom = current.zoom / 1.2;
        if (event.key === "0") zoom = 1;
        zoom = Math.max(.5, Math.min(3, zoom));
        if (zoom === current.zoom) return current;
        return { ...current, zoom, revision: current.revision + 1 };
      });
    };
    target.addEventListener("wheel", wheel, { passive: false }); target.addEventListener("keydown", keyboard);
    return () => { target.removeEventListener("wheel", wheel); target.removeEventListener("keydown", keyboard); };
  }, []);
  useLayoutEffect(() => {
    const target = reader.current;
    const position = anchor.current;
    if (target && position) {
      const ratio = view.zoom / position.zoom;
      target.scrollLeft = (position.left + position.x) * ratio - position.x;
      target.scrollTop = (position.top + position.y) * ratio - position.y;
      anchor.current = null;
    }
    zoomRef.current = view.zoom;
  }, [view.zoom]);
  const ready = loaded?.url === url;
  return <div ref={reader} tabIndex={0} role="region" aria-label="지원서 원본 연속 보기" className={styles.reader} data-pdf-zoom={view.zoom}>
    {!ready && failure !== url && <div role="status" className="p-8 text-center text-sm text-muted">PDF를 불러오고 있어요</div>}
    {failure === url && <p role="alert" className="p-6 text-sm text-fail">PDF를 불러오지 못했어요. {onRetry && <button type="button" onClick={onRetry} className="min-h-11 px-3 font-semibold">다시 시도</button>}</p>}
    {ready && <div className={styles.document}>{loaded.pages.map((size, index) => <PdfScrollPage key={index} document={loaded.document} page={index + 1} size={size} width={view.width} zoom={view.zoom} revision={view.revision} reader={reader} queue={queue} scanQueue={scanQueue} decoder={decoder} filename={filename} onRetry={onRetry} />)}</div>}
  </div>;
}

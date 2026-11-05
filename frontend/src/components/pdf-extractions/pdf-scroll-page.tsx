"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { PDFDocumentProxy, PDFPageProxy, RenderTask } from "pdfjs-dist";
import { PdfRenderQueue } from "./pdf-render-queue";
import styles from "./pdf-viewer.module.css";

export type PdfPageSize = { readonly width: number; readonly height: number };
export function PdfScrollPage({ document, page, size, width, zoom, revision, reader, queue, filename }: {
  readonly document: PDFDocumentProxy; readonly page: number; readonly size: PdfPageSize;
  readonly width: number; readonly zoom: number; readonly revision: number;
  readonly reader: RefObject<HTMLDivElement | null>; readonly queue: PdfRenderQueue; readonly filename: string;
}) {
  const wrapper = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [visibility, setVisibility] = useState({ inside: false, revision: 0 });
  const [painted, setPainted] = useState("");
  const [failure, setFailure] = useState("");
  const [attempt, setAttempt] = useState(0);
  const key = `${revision}:${visibility.revision}:${attempt}:${width}:${zoom}`;
  const ready = visibility.inside && painted === key;
  const failed = visibility.inside && failure === key;
  const cssWidth = Math.max(1, width * zoom);
  const cssHeight = cssWidth * size.height / size.width;
  useEffect(() => {
    const target = wrapper.current;
    if (!target) return;
    const observer = new IntersectionObserver(entries => {
      const inside = entries.some(entry => entry.isIntersecting);
      setVisibility(current => {
        if (current.inside === inside) return current;
        return { inside, revision: current.revision + 1 };
      });
    }, { root: reader.current, rootMargin: "100% 0px" });
    observer.observe(target); return () => observer.disconnect();
  }, [reader]);
  useEffect(() => {
    const target = canvas.current;
    if (!visibility.inside || !width || !target) return;
    let active = true;
    let task: RenderTask | undefined;
    let original: PDFPageProxy | undefined;
    void queue.enqueue(async () => {
      if (!active) return;
      original = await document.getPage(page);
      if (!active) return;
      const pixels = Math.min(window.devicePixelRatio || 1, 2, 16384 / cssWidth, 16384 / cssHeight, Math.sqrt(8_000_000 / (cssWidth * cssHeight)));
      const viewport = original.getViewport({ scale: cssWidth / size.width * pixels });
      target.width = Math.ceil(viewport.width); target.height = Math.ceil(viewport.height);
      task = original.render({ canvas: target, viewport });
      await task.promise;
      if (active) setPainted(key);
    }).catch(() => { if (active) setFailure(key); }).finally(() => { if (!active) original?.cleanup(); });
    return () => {
      active = false; task?.cancel();
      target.width = 0; target.height = 0; original?.cleanup();
    };
  }, [document, page, size.width, width, zoom, cssWidth, cssHeight, key, visibility.inside, queue]);
  return <div ref={wrapper} data-pdf-page={page} className={styles.page} style={{ width: cssWidth, height: cssHeight }}>
    <canvas ref={canvas} role="img" aria-label={`${filename} ${page}페이지`} aria-hidden={!ready} />
    {visibility.inside && !ready && !failed && <div role="status" className={styles.loading}>불러오는 중…</div>}
    {failed && <div role="alert" className={styles.loading}>이 부분을 표시하지 못했어요.<button type="button" className="min-h-11 rounded-lg px-3 font-semibold text-brand" onClick={() => setAttempt(value => value + 1)}>다시 시도</button></div>}
  </div>;
}

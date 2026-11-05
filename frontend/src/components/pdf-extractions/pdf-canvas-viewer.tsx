"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import styles from "./pdf-viewer.module.css";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";

/** 브라우저 PDF 플러그인에 의존하지 않고 선택한 원본 한 페이지만 그린다. */
export function PdfCanvasViewer({ url, filename, actions }: { readonly url: string; readonly filename: string; readonly actions?: ReactNode }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const document = useRef<PDFDocumentProxy | null>(null);
  const previousRender = useRef<Promise<unknown>>(Promise.resolve());
  const [loaded, setLoaded] = useState<{ readonly url: string; readonly count: number } | null>(null);
  const [view, setView] = useState({ page: 1, zoom: 1, width: 0, revision: 0 });
  const { page, zoom, width } = view;
  const [failure, setFailure] = useState<{ readonly url: string; readonly message: string; readonly renderKey?: string } | null>(null);
  const [rendered, setRendered] = useState("");
  let count = 0;
  if (loaded?.url === url) count = loaded.count;
  let error = "";
  const renderKey = `${url}:${view.revision}:${page}:${zoom}:${width}`;
  if (failure?.url === url && (!failure.renderKey || failure.renderKey === renderKey)) error = failure.message;
  const ready = rendered === renderKey;
  const setPage = (update: (value: number) => number) => setView(current => ({ ...current, page: update(current.page), revision: current.revision + 1 }));
  const setZoom = (value: number) => setView(current => ({ ...current, zoom: value, revision: current.revision + 1 }));

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => {
      const nextWidth = Math.floor(entries[0].contentRect.width);
      setView(current => {
        if (current.width === nextWidth) return current;
        return { ...current, width: nextWidth, revision: current.revision + 1 };
      });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let active = true;
    let loading: PDFDocumentLoadingTask | undefined;
    void import("pdfjs-dist").then(async pdfjs => {
      if (!active) return;
      pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
      const assets = `/pdfjs/${pdfjs.version}/`;
      loading = pdfjs.getDocument({ url, withCredentials: false, enableXfa: false,
        cMapUrl: `${assets}cmaps/`, cMapPacked: true, standardFontDataUrl: `${assets}standard_fonts/`,
        wasmUrl: `${assets}wasm/`, iccUrl: `${assets}iccs/`,
        // Downsize decoded images when needed instead of omitting them from the original.
        maxImageSize: -1, canvasMaxAreaInBytes: 32 * 1024 * 1024,
      });
      const opened = await loading.promise;
      if (!active) return;
      document.current = opened;
      setView(current => ({ ...current, page: 1, revision: current.revision + 1 }));
      setFailure(null);
      setLoaded({ url, count: opened.numPages });
    }).catch(() => { if (active) setFailure({ url, message: "원본 PDF를 표시하지 못했습니다. 결과를 새로고침하거나 새 창에서 확인해 주세요." }); });
    return () => {
      active = false;
      document.current = null;
      if (loading) void loading.destroy().catch(() => {});
    };
  }, [url]);

  useEffect(() => {
    const opened = document.current;
    const target = canvas.current;
    if (!opened || !target || !width || loaded?.url !== url) return;
    let active = true;
    let rendering: RenderTask | undefined;
    void opened.getPage(page).then(async original => {
      await previousRender.current;
      if (!active) return;
      const base = original.getViewport({ scale: 1 });
      const fit = Math.min(Math.max(width - 24, 150) / base.width, 1.5) * zoom;
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const viewport = original.getViewport({ scale: fit * ratio });
      target.width = Math.ceil(viewport.width);
      target.height = Math.ceil(viewport.height);
      target.style.width = `${viewport.width / ratio}px`;
      target.style.height = `${viewport.height / ratio}px`;
      rendering = original.render({ canvas: target, viewport });
      previousRender.current = rendering.promise.catch(() => {});
      await rendering.promise;
      if (active) { setFailure(null); setRendered(renderKey); }
    }).catch(() => { if (active) setFailure({ url, renderKey, message: "이 페이지를 표시하지 못했습니다. 새 창에서 원본을 확인해 주세요." }); });
    return () => { active = false; rendering?.cancel(); };
  }, [loaded, url, page, zoom, width, renderKey]);

  return <div className={styles.viewer}>
    <div className={styles.toolbar}>
      <nav aria-label="PDF 페이지 이동" className={styles.pageControls}>
        <button type="button" disabled={page <= 1 || !count} onClick={() => setPage(value => value - 1)}>← 이전 페이지</button>
        <label className="flex items-center gap-1.5">페이지 <select aria-label="PDF 페이지 선택" value={page} disabled={!count} onChange={event => setPage(() => Number(event.target.value))}>
          {count === 0 && <option value={1}>—</option>}{Array.from({ length: count }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
        </select><span aria-label="전체 페이지 수">/ {count || "—"}</span></label>
        <button type="button" disabled={!count || page >= count} onClick={() => setPage(value => value + 1)}>다음 페이지 →</button>
      </nav>
      <div className={styles.pageControls}>
        <select aria-label="PDF 확대 비율" value={zoom} onChange={event => setZoom(Number(event.target.value))}>{[.5,.75,1,1.25,1.5,2].map(value => <option key={value} value={value}>{Math.round(value * 100)}%</option>)}</select>
        <button type="button" onClick={() => setZoom(1)}>너비 맞춤</button>
      </div>
      {actions}
    </div>
    {error && <p role="alert" className="border-b border-border bg-fail-bg px-4 py-3 text-sm text-fail">{error}</p>}
    <div ref={container} className={styles.canvasArea}>
      {!ready && !error && <div role="status" className={styles.loading}><span aria-hidden="true" className="h-5 w-5 animate-spin rounded-full border-2 border-brand-soft border-t-brand motion-reduce:animate-none" />PDF 페이지를 불러오고 있어요</div>}
      <canvas ref={canvas} role="img" aria-label={`${filename} 원본 ${page}페이지`} aria-hidden={!ready} />
    </div>
  </div>;
}

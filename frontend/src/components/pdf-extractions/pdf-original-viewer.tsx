"use client";

import { useEffect, useRef, useState } from "react";
import type { PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from "pdfjs-dist";

/** 브라우저 PDF 플러그인에 의존하지 않고 선택한 원본 한 페이지만 그린다. */
export function PdfOriginalViewer({ url, filename }: { readonly url: string; readonly filename: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const container = useRef<HTMLDivElement>(null);
  const document = useRef<PDFDocumentProxy | null>(null);
  const previousRender = useRef<Promise<unknown>>(Promise.resolve());
  const [loaded, setLoaded] = useState<{ readonly url: string; readonly count: number } | null>(null);
  const [pageAt, setPageAt] = useState({ url, value: 1 });
  const [failure, setFailure] = useState<{ readonly url: string; readonly message: string } | null>(null);
  const [zoom, setZoom] = useState(0.75);
  const [width, setWidth] = useState(0);
  const count = loaded?.url === url ? loaded.count : 0;
  const page = pageAt.url === url ? pageAt.value : 1;
  const error = failure?.url === url ? failure.message : "";
  const setPage = (update: (value: number) => number) => setPageAt({ url, value: update(page) });

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(entries => setWidth(Math.floor(entries[0].contentRect.width)));
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
      setPageAt({ url, value: 1 });
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
      if (active) setFailure(null);
    }).catch(() => { if (active) setFailure({ url, message: "이 페이지를 표시하지 못했습니다. 새 창에서 원본을 확인해 주세요." }); });
    return () => { active = false; rendering?.cancel(); };
  }, [loaded, url, page, zoom, width]);

  return <div>
    <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
      <button type="button" disabled={page <= 1 || !count} onClick={() => setPage(value => value - 1)} className="min-h-11 rounded-control border border-border px-3 disabled:opacity-40">이전 쪽</button>
      <span role="status" className="px-2">{count ? `${page} / ${count}쪽` : "원본 읽는 중…"}</span>
      <button type="button" disabled={!count || page >= count} onClick={() => setPage(value => value + 1)} className="min-h-11 rounded-control border border-border px-3 disabled:opacity-40">다음 쪽</button>
      <button type="button" disabled={zoom <= 0.75} onClick={() => setZoom(value => Math.max(0.75, value - 0.25))} aria-label="원본 PDF 축소" className="min-h-11 min-w-11 rounded-control border border-border">−</button>
      <span className="num" aria-label="PDF 확대 비율">{Math.round(zoom * 100)}%</span>
      <button type="button" disabled={zoom >= 2} onClick={() => setZoom(value => Math.min(2, value + 0.25))} aria-label="원본 PDF 확대" className="min-h-11 min-w-11 rounded-control border border-border">+</button>
      <a href={url} target="_blank" rel="noopener noreferrer" className="ml-auto inline-flex min-h-11 items-center rounded-control border border-border px-3">원본 파일 새 창에서 열기<span className="sr-only"> (새 창)</span></a>
    </div>
    {error ? <p role="alert" className="mb-3 rounded-control bg-fail-bg p-3 text-sm text-fail">{error}</p> : null}
    <div ref={container} className="h-[calc(94dvh-128px)] min-h-48 overflow-auto rounded-control border border-border bg-slate-200 p-3">
      <canvas ref={canvas} role="img" aria-label={`${filename} 원본 ${page}쪽`} className={`mx-auto bg-white shadow-sm ${count ? "block" : "hidden"}`} />
    </div>
  </div>;
}

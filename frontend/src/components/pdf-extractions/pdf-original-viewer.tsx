"use client";

import dynamic from "next/dynamic";
import { useEffect, useId, useRef, useState } from "react";

const PdfCanvasViewer = dynamic(() => import("./pdf-canvas-viewer").then(module => module.PdfCanvasViewer), {
  ssr: false,
  loading: () => <p role="status" className="p-4 text-sm text-muted">원본 PDF를 불러오는 중입니다…</p>,
});

export type PdfViewMode = "original" | "canvas";

/** 두 뷰어 모두 S3의 원본을 읽는다. 브라우저 보기를 우선하고 표시되지 않으면 앱 보기로 전환한다. */
export function PdfOriginalViewer({ url, filename, onRefresh, initialMode = "original", onModeChange }: {
  readonly url: string; readonly filename: string; readonly onRefresh?: () => void;
  readonly initialMode?: PdfViewMode; readonly onModeChange?: (mode: PdfViewMode) => void;
}) {
  const [mode, setMode] = useState<PdfViewMode>(initialMode);
  const chooseMode = (next: PdfViewMode) => { setMode(next); onModeChange?.(next); };
  const helpId = useId();
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");
  const active = useRef(true);
  const downloadingRef = useRef(false);
  const downloadController = useRef<AbortController | null>(null);
  const downloadUrls = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  useEffect(() => {
    active.current = true;
    const pending = downloadUrls.current;
    return () => {
      active.current = false;
      downloadController.current?.abort();
      for (const [value, timer] of pending) { clearTimeout(timer); URL.revokeObjectURL(value); }
      pending.clear();
    };
  }, []);

  async function downloadOriginal() {
    if (downloadingRef.current) return;
    downloadingRef.current = true;
    setDownloading(true); setDownloadError("");
    const controller = new AbortController();
    downloadController.current = controller;
    try {
      // Cross-origin download 속성 대신 원본 바이트를 받아 파일로 저장한다. 서명 URL은 변경하지 않는다.
      const response = await fetch(url, { credentials: "omit", redirect: "error", signal: controller.signal });
      if (!response.ok) throw new Error("SOURCE_UNAVAILABLE");
      const blob = await response.blob();
      if (!active.current || controller.signal.aborted) return;
      const objectUrl = URL.createObjectURL(blob);
      const timer = setTimeout(() => { URL.revokeObjectURL(objectUrl); downloadUrls.current.delete(objectUrl); }, 1000);
      downloadUrls.current.set(objectUrl, timer);
      const anchor = document.createElement("a");
      anchor.href = objectUrl; anchor.download = filename;
      document.body.append(anchor); anchor.click(); anchor.remove();
    } catch {
      if (active.current && !controller.signal.aborted) setDownloadError("원본을 저장하지 못했습니다. PDF를 다시 불러온 뒤 시도해 주세요.");
    } finally {
      downloadingRef.current = false;
      if (active.current) setDownloading(false);
    }
  }

  return <div className="flex h-full min-h-0 flex-col gap-2" data-original-pdf-viewer>
    <div className="flex shrink-0 flex-wrap items-center gap-2 text-xs">
      <div role="group" aria-label="PDF 보기 방식" aria-describedby={helpId} className="flex rounded-control border border-border bg-surface p-1">
        <button type="button" aria-pressed={mode === "original"} onClick={() => chooseMode("original")} className={`min-h-11 rounded-lg px-3 font-semibold ${mode === "original" ? "bg-card text-foreground shadow-sm" : "text-muted"}`}>브라우저 보기</button>
        <button type="button" aria-pressed={mode === "canvas"} onClick={() => chooseMode("canvas")} className={`min-h-11 rounded-lg px-3 font-semibold ${mode === "canvas" ? "bg-card text-foreground shadow-sm" : "text-muted"}`}>앱에서 보기</button>
      </div>
      {onRefresh && <button type="button" onClick={onRefresh} className="min-h-11 rounded-control px-3 font-semibold text-muted-strong hover:bg-surface">다시 불러오기</button>}
      <div className="ml-auto flex gap-2">
        <button type="button" disabled={downloading} onClick={() => void downloadOriginal()} className="min-h-11 rounded-control border border-border px-3 font-semibold disabled:opacity-50">{downloading ? "저장 중…" : "원본 다운로드"}</button>
        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-control border border-border px-3 font-semibold">원본 새 창<span className="sr-only">에서 열기 (새 창)</span><span aria-hidden="true" className="ml-1">↗</span></a>
      </div>
    </div>
    {downloadError && <p role="alert" className="shrink-0 text-xs text-fail">{downloadError}</p>}
    <div id={helpId} className="shrink-0 rounded-control bg-surface px-3 py-2 text-xs leading-5 text-muted-strong">
      <p>{mode === "original"
        ? "Chrome·Safari에서는 브라우저 보기를 권장해요. GPT 브라우저에서 화면이 비어 있으면 ‘앱에서 보기’로 전환해 주세요."
        : "Safari에서 표시되지 않으면 ‘브라우저 보기’로 전환해 주세요."}</p>
      <p className="mt-0.5 text-muted">두 보기 모두 같은 원본 PDF를 사용해요. 계속 보이지 않으면 원본을 다운로드해 주세요.</p>
    </div>
    {mode === "original" ? <iframe title={`${filename} 원본 PDF`} src={url} referrerPolicy="no-referrer" className="block min-h-[55dvh] w-full flex-1 rounded-control border border-border bg-slate-100" />
      : <div className="min-h-0 flex-1 overflow-auto"><PdfCanvasViewer url={url} filename={filename} /></div>}
  </div>;
}

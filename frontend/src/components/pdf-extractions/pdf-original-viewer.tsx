"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

const PdfCanvasViewer = dynamic(() => import("./pdf-canvas-viewer").then(module => module.PdfCanvasViewer), {
  ssr: false,
  loading: () => <p role="status" className="p-4 text-sm text-muted">원본 PDF를 불러오는 중입니다…</p>,
});

export function PdfOriginalViewer({ url, filename, onRefresh }: {
  readonly url: string; readonly filename: string; readonly onRefresh?: () => void;
}) {
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

  const actions = <div className="flex flex-wrap items-center gap-1.5">
    {onRefresh && <button type="button" onClick={onRefresh} className="min-h-11 rounded-lg px-3 text-xs font-semibold text-muted-strong hover:bg-card">다시 불러오기</button>}
    <button type="button" disabled={downloading} onClick={() => void downloadOriginal()} className="min-h-11 rounded-lg px-3 text-xs font-semibold text-muted-strong hover:bg-card disabled:opacity-50">
      {downloading && "저장 중…"}{!downloading && "다운로드"}
    </button>
    <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center rounded-lg px-3 text-xs font-semibold text-muted-strong hover:bg-card">새 창 ↗<span className="sr-only">에서 원본 PDF 열기</span></a>
  </div>;
  return <div className="min-h-0" data-original-pdf-viewer>
    {downloadError && <p role="alert" className="border-b border-border bg-fail-bg px-4 py-3 text-xs text-fail">{downloadError}</p>}
    <PdfCanvasViewer url={url} filename={filename} actions={actions} />
  </div>;
}

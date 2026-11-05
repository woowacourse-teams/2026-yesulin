"use client";

import dynamic from "next/dynamic";
const PdfCanvasViewer = dynamic(() => import("./pdf-canvas-viewer").then(module => module.PdfCanvasViewer), {
  ssr: false, loading: () => <p role="status" className="p-6 text-sm text-muted">PDF를 불러오고 있어요</p>,
});
export function PdfOriginalViewer({ url, filename, onRefresh }: { readonly url: string; readonly filename: string; readonly onRefresh?: () => void }) {
  return <div data-original-pdf-viewer><PdfCanvasViewer url={url} filename={filename} onRetry={onRefresh} /></div>;
}

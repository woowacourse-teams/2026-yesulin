"use client";

import { useEffect, useEffectEvent, useState } from "react";
import type { PdfFit } from "@/components/pdf-extractions/pdf-canvas-viewer";
import { PdfExpandableFrame, type PdfFrameState } from "@/components/pdf-extractions/pdf-expandable-frame";
import { PdfOriginalViewer } from "@/components/pdf-extractions/pdf-original-viewer";
import { SecondaryButton } from "@/components/ui/controls";
import { fetchPdfExtraction } from "@/features/pdf-extractions/api";
import { isUnauthorized } from "@/features/pdf-reviews/api";

type Props = { readonly jobId: string; readonly onUnauthorized: () => void; readonly frame?: PdfFrameState };

/** Refresh the signed source URL each time the original is opened, independently of the profile cache. */
export function ReviewOriginalDocument({ jobId, onUnauthorized, frame }: Props) {
  const [attempt, setAttempt] = useState(0);
  const [source, setSource] = useState<{ jobId: string; attempt: number; url: string; filename: string } | null>(null);
  const [failure, setFailure] = useState<{ jobId: string; attempt: number; message: string } | null>(null);
  const unauthorized = useEffectEvent(onUnauthorized);
  useEffect(() => {
    const controller = new AbortController();
    void fetchPdfExtraction(jobId, true, controller.signal).then(job => {
      if (controller.signal.aborted) return;
      if (!job.sourceUrl) throw new Error("원본 PDF가 아직 준비되지 않았습니다.");
      setSource({ jobId, attempt, url: job.sourceUrl, filename: job.originalFilename });
    }).catch(cause => {
      if (controller.signal.aborted) return;
      if (isUnauthorized(cause)) unauthorized();
      setFailure({ jobId, attempt, message: cause instanceof Error ? cause.message : "원본 PDF를 불러오지 못했습니다." });
    });
    return () => controller.abort();
  }, [jobId, attempt]);
  const error = failure?.jobId === jobId && failure.attempt === attempt ? failure.message : null;
  const retry = () => setAttempt(value => value + 1);
  const content = (fit: PdfFit) => {
    if (error) return <div className="p-6"><p role="alert" className="mb-3 text-sm text-fail">{error}</p><SecondaryButton onClick={retry}>원본 다시 불러오기</SecondaryButton></div>;
    if (source?.jobId === jobId && source.attempt === attempt) return <PdfOriginalViewer key={source.url} url={source.url} filename={source.filename} onRefresh={retry} fit={fit} />;
    return <p role="status" className="p-6">원본 PDF를 불러오는 중입니다…</p>;
  };
  if (!frame) return content("width");
  return <PdfExpandableFrame {...frame}>{content}</PdfExpandableFrame>;
}

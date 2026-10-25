"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { PdfOriginalViewer } from "@/components/pdf-extractions/pdf-original-viewer";
import { SecondaryButton } from "@/components/ui/controls";
import { fetchPdfExtraction } from "@/features/pdf-extractions/api";
import { isUnauthorized } from "@/features/pdf-reviews/api";

/** Refresh the signed source URL each time the original is opened, independently of the profile cache. */
export function ReviewOriginalDocument({ jobId, onUnauthorized }: { readonly jobId: string; readonly onUnauthorized: () => void }) {
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
  if (error) return <div className="p-6"><p role="alert" className="mb-3 text-sm text-fail">{error}</p><SecondaryButton onClick={() => setAttempt(value => value + 1)}>원본 다시 불러오기</SecondaryButton></div>;
  return source?.jobId === jobId && source.attempt === attempt
    ? <div className="p-3"><PdfOriginalViewer key={source.url} url={source.url} filename={source.filename} /></div>
    : <p role="status" className="p-6">원본 PDF를 불러오는 중입니다…</p>;
}

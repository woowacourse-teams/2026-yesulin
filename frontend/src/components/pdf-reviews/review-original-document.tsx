"use client";

import { useEffect, useEffectEvent, useState } from "react";
import type { PdfFit } from "@/components/pdf-extractions/pdf-canvas-viewer";
import { PdfExpandableFrame, type PdfFrameState } from "@/components/pdf-extractions/pdf-expandable-frame";
import { PdfOriginalViewer } from "@/components/pdf-extractions/pdf-original-viewer";
import { SecondaryButton } from "@/components/ui/controls";
import { observePdfExtraction } from "@/features/analytics/pdf-analytics";
import type { PdfSource, PdfSourceCache } from "@/features/pdf-reviews/pdf-source-cache";
import { isUnauthorized } from "@/features/pdf-reviews/api";

type Props = { readonly jobId: string; readonly sources: PdfSourceCache; readonly onUnauthorized: () => void;
  readonly frame?: PdfFrameState; readonly prefetchJobId?: string };

/** Shows the original from the review's in-memory cache, then quietly downloads the next applicant's original. */
export function ReviewOriginalDocument({ jobId, sources, onUnauthorized, frame, prefetchJobId }: Props) {
  const [attempt, setAttempt] = useState(0);
  const [source, setSource] = useState<{ jobId: string; attempt: number; url: string; filename: string } | null>(null);
  const [failure, setFailure] = useState<{ jobId: string; attempt: number; message: string } | null>(null);
  const show = useEffectEvent((loaded: PdfSource) => {
    setSource({ jobId, attempt, ...loaded });
    if (prefetchJobId) sources.prefetch(prefetchJobId);
  });
  const fail = useEffectEvent((cause: unknown) => {
    if (isUnauthorized(cause)) onUnauthorized();
    setFailure({ jobId, attempt, message: failureMessage(cause) });
  });
  useEffect(() => {
    let active = true;
    const entry = sources.open(jobId);
    entry.job.then(job => { if (active) observePdfExtraction(job); }, () => {});
    entry.source.then(loaded => { if (active) show(loaded); }, cause => { if (active) fail(cause); });
    return () => { active = false; };
  }, [sources, jobId, attempt]);
  const error = failure?.jobId === jobId && failure.attempt === attempt ? failure.message : null;
  const retry = () => { sources.forget(jobId); setAttempt(value => value + 1); };
  const content = (fit: PdfFit) => {
    if (error) return <div className="p-6"><p role="alert" className="mb-3 text-sm text-fail">{error}</p><SecondaryButton onClick={retry}>원본 다시 불러오기</SecondaryButton></div>;
    if (source?.jobId === jobId && source.attempt === attempt) return <PdfOriginalViewer key={source.url} url={source.url} filename={source.filename} onRefresh={retry} fit={fit} />;
    return <p role="status" className="p-6">원본 PDF를 불러오는 중입니다…</p>;
  };
  if (!frame) return content("width");
  return <PdfExpandableFrame {...frame}>{content}</PdfExpandableFrame>;
}

function failureMessage(cause: unknown) {
  if (cause instanceof Error) return cause.message;
  return "원본 PDF를 불러오지 못했습니다.";
}

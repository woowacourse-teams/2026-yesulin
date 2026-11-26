"use client";

import { useEffect, useEffectEvent, useState } from "react";
import type { PdfFit } from "@/components/pdf-extractions/pdf-canvas-viewer";
import { PdfExpandableFrame, type PdfFrameContent, type PdfFrameState } from "@/components/pdf-extractions/pdf-expandable-frame";
import { PdfOriginalViewer } from "@/components/pdf-extractions/pdf-original-viewer";
import { SecondaryButton } from "@/components/ui/controls";
import { fetchPdfExtraction } from "@/features/pdf-extractions/api";
import { isUnauthorized } from "@/features/pdf-reviews/api";
import { LoadingStatus } from "./loading-status";

type Props = { readonly jobId: string; readonly onUnauthorized: () => void; readonly frame?: PdfFrameState };

/** 업로드가 끝나기 전에 연 원본은 이 간격으로 다시 확인하고, 이 횟수를 넘기면 수동 재시도로 넘긴다. */
export const SOURCE_WAIT_MS = 1500;
export const SOURCE_WAIT_LIMIT = 40;

class SourceNotReady extends Error {}

type Failure = { readonly jobId: string; readonly attempt: number; readonly message: string; readonly notReady: boolean };

/** Refresh the signed source URL each time the original is opened, independently of the profile cache. */
export function ReviewOriginalDocument({ jobId, onUnauthorized, frame }: Props) {
  const [attempt, setAttempt] = useState(0);
  const [source, setSource] = useState<{ jobId: string; attempt: number; url: string; filename: string } | null>(null);
  const [failure, setFailure] = useState<Failure | null>(null);
  const unauthorized = useEffectEvent(onUnauthorized);
  useEffect(() => {
    const controller = new AbortController();
    void fetchPdfExtraction(jobId, true, controller.signal).then(job => {
      if (controller.signal.aborted) return;
      if (!job.sourceUrl) throw new SourceNotReady("원본 PDF가 아직 준비되지 않았습니다.");
      setSource({ jobId, attempt, url: job.sourceUrl, filename: job.originalFilename });
    }).catch(cause => {
      if (controller.signal.aborted) return;
      if (isUnauthorized(cause)) unauthorized();
      setFailure({ jobId, attempt, message: failureMessage(cause), notReady: cause instanceof SourceNotReady });
    });
    return () => controller.abort();
  }, [jobId, attempt]);
  const current = currentFailure(failure, jobId, attempt);
  const retryScheduled = !!current?.notReady && attempt < SOURCE_WAIT_LIMIT;
  const waiting = retryScheduled || refetchingAfterWait(failure, jobId, attempt);
  const retry = () => setAttempt(value => value + 1);
  useEffect(() => {
    if (!retryScheduled) return;
    const timer = setTimeout(() => setAttempt(value => value + 1), SOURCE_WAIT_MS);
    return () => clearTimeout(timer);
  }, [retryScheduled, current]);
  const content: PdfFrameContent = (fit: PdfFit, expanded = false, onPagerChange) => {
    if (source?.jobId === jobId && source.attempt === attempt) return <PdfOriginalViewer key={source.url} url={source.url} filename={source.filename} onRefresh={retry} fit={fit} zoomScope={String(expanded)} onPagerChange={onPagerChange} />;
    if (waiting) return <LoadingStatus>원본 PDF를 올리는 중입니다…</LoadingStatus>;
    if (current) return <div className="p-6"><p role="alert" className="mb-3 text-sm text-fail">{current.message}</p><SecondaryButton onClick={retry}>원본 다시 불러오기</SecondaryButton></div>;
    return <LoadingStatus>원본 PDF를 불러오는 중입니다…</LoadingStatus>;
  };
  if (!frame) return content("width", false);
  return <PdfExpandableFrame {...frame}>{content}</PdfExpandableFrame>;
}

function currentFailure(failure: Failure | null, jobId: string, attempt: number): Failure | null {
  if (failure?.jobId === jobId && failure.attempt === attempt) return failure;
  return null;
}

/** 기다리다 다시 조회하는 동안에도 같은 문구를 유지해 1.5초마다 문구와 알림이 바뀌지 않게 한다. */
function refetchingAfterWait(failure: Failure | null, jobId: string, attempt: number): boolean {
  return failure?.jobId === jobId && failure.notReady && failure.attempt === attempt - 1;
}

function failureMessage(cause: unknown): string {
  if (cause instanceof Error) return cause.message;
  return "원본 PDF를 불러오지 못했습니다.";
}

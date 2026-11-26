"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import type { PdfFit } from "@/components/pdf-extractions/pdf-canvas-viewer";
import { PdfExpandableFrame, type PdfFrameContent, type PdfFrameState } from "@/components/pdf-extractions/pdf-expandable-frame";
import { PdfOriginalViewer } from "@/components/pdf-extractions/pdf-original-viewer";
import { SecondaryButton } from "@/components/ui/controls";
import { observeReviewDocumentPreview, trackReviewDocumentDownload } from "@/features/analytics/review-document";
import { fetchPdfExtraction } from "@/features/pdf-extractions/api";
import type { PdfExtractionJob } from "@/features/pdf-extractions/types";
import { isUnauthorized } from "@/features/pdf-reviews/api";
import { acceptsDocument, LEGACY_EXTENSIONS } from "@/features/pdf-reviews/upload-selection";
import { LoadingStatus } from "./loading-status";

type Props = { readonly reviewId: string; readonly jobId: string; readonly filename: string; readonly onUnauthorized: () => void; readonly frame?: PdfFrameState };
export const SOURCE_WAIT_MS = 1500;
export const SOURCE_WAIT_LIMIT = 40;

type Snapshot = {
  jobId: string; job?: PdfExtractionJob; originalFilename?: string; error?: string; timedOut?: boolean;
};

function httpStatus(cause: unknown) {
  if (cause instanceof Error && "status" in cause && typeof cause.status === "number") return cause.status;
}

function temporaryLookupFailure(cause: unknown) {
  const status = httpStatus(cause);
  return status === undefined || status === 408 || status === 429 || status >= 500;
}

function documentPending(job: PdfExtractionJob) {
  return !job.sourceUrl && job.previewStatus !== "FAILED" && job.status !== "UPLOAD_EXPIRED";
}

function waitingCopy(job: PdfExtractionJob) {
  if (job.uploadedAt || job.originalUrl) return "지원서를 PDF로 변환하는 중입니다…";
  return "지원서 파일을 올리는 중입니다…";
}

function unavailableCopy(job: PdfExtractionJob) {
  if (job.previewStatus === "FAILED") return "미리보기를 만들지 못했습니다. 제출한 원본 파일을 확인해 주세요.";
  if (job.status === "UPLOAD_EXPIRED") return "업로드 기한이 지났습니다. 파일을 다시 올려 주세요.";
  return "지원서 미리보기가 아직 준비되지 않았습니다.";
}

export function ReviewOriginalDocument({ reviewId, jobId, filename, onUnauthorized, frame }: Props) {
  const [reload, setReload] = useState(0);
  const [snapshot, setSnapshot] = useState<Snapshot>();
  const activeLookup = useRef<AbortController | null>(null);
  const observedJob = useRef<string | null>(null);
  const unauthorized = useEffectEvent(onUnauthorized);
  useEffect(() => {
    const controller = new AbortController();
    activeLookup.current = controller;
    let timer: ReturnType<typeof setTimeout>;
    let polls = 0;
    let lookupMode: true | "document" = "document";
    if (acceptsDocument(filename, LEGACY_EXTENSIONS)) lookupMode = true;
    async function lookup() {
      if (controller.signal.aborted) return;
      try {
        const job = await fetchPdfExtraction(jobId, lookupMode, controller.signal);
        if (controller.signal.aborted) return;
        if (job.uploadedAt && observedJob.current !== jobId) {
          observedJob.current = jobId;
          void observeReviewDocumentPreview(reviewId, job);
        }
        const pending = documentPending(job);
        const timedOut = pending && polls >= SOURCE_WAIT_LIMIT;
        const originalFilename = job.originalUrl && job.originalFilename || undefined;
        setSnapshot({ jobId, job, originalFilename, timedOut });
        if (pending && !timedOut) {
          polls += 1;
          timer = setTimeout(lookup, SOURCE_WAIT_MS);
        }
      } catch (cause) {
        if (controller.signal.aborted) return;
        if (isUnauthorized(cause)) unauthorized();
        const error = cause instanceof Error && cause.message || "미리보기를 불러오지 못했습니다.";
        setSnapshot(previous => {
          if (previous?.jobId === jobId && temporaryLookupFailure(cause)) {
            return { jobId, error, originalFilename: previous.originalFilename };
          }
          return { jobId, error };
        });
      }
    }
    void lookup();
    return () => { clearTimeout(timer); controller.abort(); };
  }, [reviewId, jobId, filename, reload]);
  let current: Snapshot | undefined;
  if (snapshot?.jobId === jobId) current = snapshot;
  const job = current?.job;
  const retry = () => setReload(value => value + 1);
  function revokeOriginal(cause: unknown) {
    activeLookup.current?.abort();
    setSnapshot({ jobId, error: "이 지원서에 접근할 수 없습니다." });
    if (isUnauthorized(cause)) onUnauthorized();
  }
  const content: PdfFrameContent = (fit: PdfFit, expanded = false, onPagerChange) => {
    if (job && job.sourceUrl) return <PdfOriginalViewer key={job.sourceUrl} url={job.sourceUrl} filename={job.originalFilename} onRefresh={retry} fit={fit} zoomScope={String(expanded)} onPagerChange={onPagerChange} />;
    if (job && documentPending(job) && !current?.timedOut) return <LoadingStatus>{waitingCopy(job)}</LoadingStatus>;
    if (job) return <DocumentNotice message={unavailableCopy(job)} retry={retry} />;
    if (current && current.error) return <DocumentNotice message={current.error} retry={retry} />;
    return <LoadingStatus>지원서 미리보기를 불러오는 중입니다…</LoadingStatus>;
  };
  function viewer() {
    if (!frame || (!frame.expanded && !job?.sourceUrl)) return content("width", false);
    return <PdfExpandableFrame {...frame}>{content}</PdfExpandableFrame>;
  }
  return <>
    {current?.originalFilename && <div className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 px-3 py-2">
      {job?.sourceUrl && acceptsDocument(job.originalFilename, ["hwp", "hwpx"]) && <p className="mr-auto min-w-0 flex-1 basis-48 text-sm text-muted-strong">
        한글 미리보기는 사진이나 표 배치가 달라질 수 있습니다. 정확한 배치는 원본을 확인해 주세요.
      </p>}
      <OriginalDownload key={jobId} reviewId={reviewId} jobId={jobId} filename={current.originalFilename} onAccessLost={revokeOriginal} />
    </div>}
    {viewer()}
  </>;
}

function DocumentNotice({ message, retry }: { message: string; retry: () => void }) {
  return <div className="p-6"><p role="alert" className="mb-3 text-sm text-fail">{message}</p>
    <SecondaryButton onClick={retry}>미리보기 다시 불러오기</SecondaryButton></div>;
}

function OriginalDownload({ reviewId, jobId, filename, onAccessLost }: { reviewId: string; jobId: string; filename: string; onAccessLost: (cause: unknown) => void }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const activeDownload = useRef<AbortController | null>(null);
  useEffect(() => () => activeDownload.current?.abort(), []);
  async function download() {
    const controller = new AbortController();
    activeDownload.current = controller;
    setLoading(true);
    setError("");
    try {
      const job = await fetchPdfExtraction(jobId, "document", controller.signal);
      if (controller.signal.aborted) return;
      if (!job.originalUrl) throw new Error("원본 파일이 아직 준비되지 않았습니다.");
      const link = document.createElement("a");
      link.href = job.originalUrl;
      link.download = filename;
      link.rel = "noreferrer";
      link.click();
      void trackReviewDocumentDownload(reviewId, job);
    } catch (cause) {
      if (controller.signal.aborted) return;
      const status = httpStatus(cause);
      if (status === 401 || status === 403 || status === 404) {
        onAccessLost(cause);
        return;
      }
      setError("원본을 내려받지 못했습니다. 다시 시도해 주세요.");
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }
  return <div><SecondaryButton disabled={loading} onClick={() => void download()}>원본 다운로드</SecondaryButton>
    {error && <p role="alert" className="text-sm text-fail">{error}</p>}</div>;
}

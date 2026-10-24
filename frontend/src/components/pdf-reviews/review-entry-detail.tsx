"use client";

import { useEffect, useState } from "react";
import { PdfExtractionResultPanel } from "@/components/pdf-extractions/pdf-extraction-result";
import { SecondaryButton } from "@/components/ui/controls";
import { fetchPdfExtraction } from "@/features/pdf-extractions/api";
import type { PdfExtractionJob } from "@/features/pdf-extractions/types";
import { isUnauthorized } from "@/features/pdf-reviews/api";
import { matchStatusLabels, sameKey, type ReviewDetail, type ReviewEntry } from "@/features/pdf-reviews/types";
import { ReviewEntryForm } from "./review-entry-form";
import { ReviewEntryReanalysis } from "./review-entry-reanalysis";

type Props = {
  readonly review: ReviewDetail;
  readonly entry: ReviewEntry;
  /** 값이 바뀌면 원본·추출 결과를 다시 읽는다. 선택한 항목의 추출 완료 이벤트가 올리면 된다. */
  readonly refreshKey: number;
  readonly onSaved: (entry: ReviewEntry) => void;
  readonly onUnauthorized: () => void;
};

function ReadOnlyField({ label, value, muted = false }: { readonly label: string; readonly value: string; readonly muted?: boolean }) {
  return <div className="min-w-0">
    <dt className="text-xs font-semibold text-muted-strong">{label}</dt>
    <dd className={`mt-1 break-words text-sm ${muted ? "text-muted-strong" : "font-semibold"}`}>{value}</dd>
  </div>;
}

export function ReviewEntryDetail({ review, entry, refreshKey, onSaved, onUnauthorized }: Props) {
  const [job, setJob] = useState<PdfExtractionJob | null>(null);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [mutating, setMutating] = useState(false);
  const role = entry.matchStatus === "MATCHED" ? review.roles.find(item => sameKey(item.id, entry.roleId))?.name : undefined;

  useEffect(() => {
    const controller = new AbortController();
    fetchPdfExtraction(entry.jobId, true, controller.signal)
      .then(next => { if (!controller.signal.aborted) { setJob(next); setError(""); } })
      .catch(cause => {
        if (controller.signal.aborted) return;
        if (isUnauthorized(cause)) onUnauthorized();
        setError(cause instanceof Error ? cause.message : "원본과 추출 결과를 불러오지 못했습니다.");
      });
    return () => controller.abort();
  }, [entry.jobId, entry.matchStatus, refreshKey, retry, onUnauthorized]);

  return <div className="min-w-0 space-y-5">
    <section aria-label="지원자 정보" className="rounded-card border border-border bg-card p-5">
      <h2 className="break-all text-lg font-bold">{entry.originalFilename}</h2>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2">
        <ReadOnlyField label="지원자 이름 (읽기 전용)" value={entry.applicantName?.trim() || "이름 확인 필요"} />
        <ReadOnlyField label="지원 배역 (읽기 전용)" value={role ?? "배역 확인 필요"} />
        <ReadOnlyField label="배역 확인 상태" value={matchStatusLabels[entry.matchStatus]} />
        {entry.matchEvidence ? <ReadOnlyField label="지원서에 적힌 근거" value={entry.matchEvidence} muted /> : null}
      </dl>
      <ReviewEntryReanalysis key={String(entry.id)} reviewId={review.id} entryId={entry.id}
        ready={entry.matchStatus !== "WAITING" && job?.jobId === entry.jobId && !!job.result}
        disabled={mutating} onBusyChange={setMutating} onSaved={onSaved} onUnauthorized={onUnauthorized} />
      <div className="mt-5"><ReviewEntryForm key={String(entry.id)} reviewId={review.id} entry={entry}
        disabled={mutating} onBusyChange={setMutating} onSaved={onSaved} onUnauthorized={onUnauthorized} /></div>
    </section>
    {error ? <div role="alert" className="rounded-control border border-border bg-card p-4 text-sm text-fail">
      <p className="break-words">{error}</p>
      <SecondaryButton onClick={() => setRetry(value => value + 1)} className="mt-2">원본 다시 불러오기</SecondaryButton>
    </div> : null}
    {job && job.jobId === entry.jobId ? <PdfExtractionResultPanel job={job} />
      : <div role="status" className="rounded-card border border-border bg-card p-8 text-sm leading-7 text-muted-strong">원본 PDF와 추출 결과를 불러오고 있습니다.</div>}
  </div>;
}

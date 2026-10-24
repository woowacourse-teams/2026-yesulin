"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthSession } from "@/components/auth/auth-session";
import { SecondaryButton } from "@/components/ui/controls";
import { sameKey, type EntryFilter, type ReviewDetail, type ReviewKey } from "@/features/pdf-reviews/types";
import { usePdfExtractionEvents } from "@/features/pdf-reviews/use-extraction-events";
import { usePdfReviews } from "@/features/pdf-reviews/use-pdf-reviews";
import { useReviewUploads } from "@/features/pdf-reviews/use-review-uploads";
import { ReviewCreateForm } from "./review-create-form";
import { ReviewEntryDetail } from "./review-entry-detail";
import { ReviewEntryList } from "./review-entry-list";
import { ReviewList } from "./review-list";
import { ReviewLoginGate, SessionExpiredNotice } from "./review-session";
import { ReviewUploadPanel } from "./review-upload-panel";

const UPLOAD_SYNC_DELAY_MS = 600;
const eventsText = { CONNECTING: "자동 갱신에 연결하는 중…", CONNECTED: "새 결과가 오면 자동으로 갱신됩니다.", DISCONNECTED: "자동 갱신이 멈췄습니다. ‘목록 새로고침’을 눌러 확인해 주세요." } as const;

export function PdfReviewWorkbench({ local = false }: { readonly local?: boolean }) {
  const { session, sessionReady } = useAuthSession();
  const authorized = session?.role === "PRODUCER";
  const [expired, setExpired] = useState(false);
  const [filter, setFilter] = useState<EntryFilter>("ALL");
  const [entryId, setEntryId] = useState<ReviewKey | null>(null);
  const [detailRefresh, setDetailRefresh] = useState(0);
  const [eventsKey, setEventsKey] = useState(0);
  const uploadSync = useRef<ReturnType<typeof setTimeout>>(undefined);
  const markExpired = useCallback(() => setExpired(true), []);
  const reviews = usePdfReviews({ enabled: authorized, onUnauthorized: markExpired });
  const { sync } = reviews;
  const review = reviews.detail;
  const entry = review?.entries.find(item => sameKey(item.id, entryId)) ?? null;

  // 파일을 연달아 올리는 동안에는 마지막 업로드 뒤 한 번만 다시 읽는다.
  const onUploaded = useCallback(() => {
    clearTimeout(uploadSync.current);
    uploadSync.current = setTimeout(() => void sync(), UPLOAD_SYNC_DELAY_MS);
  }, [sync]);
  useEffect(() => () => clearTimeout(uploadSync.current), []);
  const uploads = useReviewUploads({ onUploaded, onUnauthorized: markExpired });

  const eventsState = usePdfExtractionEvents({
    enabled: authorized, reconnectKey: eventsKey,
    sync: async completedJobIds => {
      await sync();
      if (entry && completedJobIds.includes(entry.jobId)) setDetailRefresh(value => value + 1);
    },
  });

  function openReview(id: ReviewKey) {
    if (sameKey(reviews.selectedId, id)) return;
    setFilter("ALL"); setEntryId(null);
    reviews.open(id);
  }

  function created(next: ReviewDetail) {
    setFilter("ALL"); setEntryId(null);
    reviews.created(next);
  }

  async function recheckSession() {
    setExpired(false);
    setEventsKey(value => value + 1);
    await reviews.refresh();
  }

  function manualRefresh() {
    if (eventsState === "DISCONNECTED") setEventsKey(value => value + 1);
    setDetailRefresh(value => value + 1);
    void reviews.refresh();
  }

  return <div className="min-h-screen bg-surface px-5 py-8 text-foreground md:px-8">
    <div className="mx-auto max-w-[1440px]">
      <p className="mb-2 text-xs font-semibold tracking-wider text-brand">{local ? "LOCALSTACK · 로컬 전용" : "서류 심사"}</p>
      <h1 className="text-2xl font-bold tracking-tight md:text-3xl">PDF 지원서 심사</h1>
      <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-strong">심사 제목과 배역을 만든 뒤 지원서 PDF를 여러 개 올리면 지원자별로 정리됩니다. 원본을 보며 메모를 남기고 합격·불합격은 담당자가 직접 정합니다.</p>
      {local ? <p className="mt-3 rounded-control border border-brand-line bg-brand-soft px-4 py-3 text-sm leading-6 text-brand">
        로컬 확인용 안내: 파일은 이 PC의 LocalStack에 올라가고 Lambda 컨테이너가 추출합니다. 지원 배역은 지원서에 명시된 문구만 근거로 분류하며 Bedrock은 아직 연결되지 않았습니다. 문구가 없거나 모호하면 ‘배역 확인 필요’로 남습니다.
      </p> : null}
      {!authorized ? <ReviewLoginGate local={local} ready={sessionReady} /> : <>
        {expired ? <SessionExpiredNotice local={local} onRecheck={() => void recheckSession()} /> : null}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <SecondaryButton onClick={manualRefresh} disabled={reviews.refreshing} aria-label="목록 새로고침" className="min-h-11">{reviews.refreshing ? "불러오는 중…" : "목록 새로고침"}</SecondaryButton>
          <p role="status" className="text-sm text-muted-strong">{eventsText[eventsState]}</p>
        </div>
        <div className="mt-5 grid min-w-0 items-start gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <div className="min-w-0 space-y-4">
            <ReviewCreateForm onCreated={created} onUnauthorized={markExpired} />
            <ReviewList reviews={reviews.reviews} selectedId={reviews.selectedId} loading={reviews.listLoading} error={reviews.listError} onSelect={openReview} onRetry={() => void reviews.refresh()} />
          </div>
          <div className="min-w-0 space-y-6">
            {reviews.selectedId === null ? <p role="status" className="rounded-card border border-border bg-card p-8 text-sm leading-7 text-muted-strong">왼쪽에서 심사를 선택하거나 새로 만들면 지원서를 올리고 확인할 수 있습니다.</p>
              : !review ? (reviews.detailError
                ? <div role="alert" className="rounded-card border border-border bg-card p-6 text-sm text-fail"><p className="break-words">{reviews.detailError}</p><SecondaryButton onClick={() => void reviews.refresh()} className="mt-3">다시 불러오기</SecondaryButton></div>
                : <p role="status" className="rounded-card border border-border bg-card p-8 text-sm text-muted-strong">심사를 불러오고 있습니다…</p>)
                : <>
                  <section aria-label="선택한 심사" className="min-w-0 rounded-card border border-border bg-card p-5">
                    <h2 className="break-words text-lg font-bold">{review.title}</h2>
                    <p className="mt-2 break-words text-sm text-muted-strong">배역 {review.roles.length}개: {review.roles.map(role => role.name).join(", ")}</p>
                    {reviews.detailError ? <p role="alert" className="mt-3 break-words rounded-control bg-fail-bg p-3 text-sm text-fail">{reviews.detailError}</p> : null}
                  </section>
                  <ReviewUploadPanel reviewId={review.id} rows={uploads.rows} busy={uploads.busy} message={uploads.message} disabled={expired}
                    onChoose={files => uploads.choose(review.id, files, review.entries.length)} onUploadAll={() => void uploads.uploadAll(review.id)}
                    onRetry={row => void uploads.retry(row)} onRemove={uploads.remove} />
                  <div className="grid min-w-0 items-start gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
                    <ReviewEntryList key={String(review.id)} review={review} filter={filter} selectedEntryId={entryId} onFilter={setFilter} onSelect={item => setEntryId(item.id)} />
                    {entry ? <ReviewEntryDetail key={String(entry.id)} review={review} entry={entry} refreshKey={detailRefresh} onSaved={reviews.replaceEntry} onUnauthorized={markExpired} />
                      : <p role="status" className="rounded-card border border-border bg-card p-8 text-sm leading-7 text-muted-strong">지원 항목을 선택하면 원본 PDF와 추출 내용을 보며 메모와 결정을 남길 수 있습니다.</p>}
                  </div>
                </>}
          </div>
        </div>
      </>}
    </div>
  </div>;
}

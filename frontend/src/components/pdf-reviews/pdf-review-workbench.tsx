"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthSession } from "@/components/auth/auth-session";
import { ModalShell } from "@/components/auditions/modal-shell";
import { PrimaryButton, SecondaryButton } from "@/components/ui/controls";
import { matchesFilter, type EntryFilter, type ReviewDetail, type ReviewKey } from "@/features/pdf-reviews/types";
import { usePdfExtractionEvents } from "@/features/pdf-reviews/use-extraction-events";
import { usePdfReviews } from "@/features/pdf-reviews/use-pdf-reviews";
import { useReviewUploads } from "@/features/pdf-reviews/use-review-uploads";
import { ReviewCreateForm } from "./review-create-form";
import { ReviewList } from "./review-list";
import { ReviewLoginGate, SessionExpiredNotice } from "./review-session";
import { ReviewUploadPanel } from "./review-upload-panel";
import { ScreeningBoard } from "./screening-board";
import styles from "./screening.module.css";

export function PdfReviewWorkbench({ local = false }: { readonly local?: boolean }) {
  const { session, sessionReady } = useAuthSession();
  const authorized = session?.role === "PRODUCER";
  const [expired, setExpired] = useState(false);
  const [home, setHome] = useState(true);
  const [filter, setFilter] = useState<EntryFilter>("ALL");
  const [after, setAfter] = useState(false);
  const [view, setView] = useState<"single" | "card" | "table">("single");
  const [detailRefresh, setDetailRefresh] = useState(0);
  const [eventsKey, setEventsKey] = useState(0);
  const [drag, setDrag] = useState(false);
  const uploadInput = useRef<HTMLInputElement>(null);
  const dirty = useRef(false);
  const onDirtyChange = useCallback((value: boolean) => { dirty.current = value; }, []);
  const [pendingNavigation, setPendingNavigation] = useState<{ action: () => void } | null>(null);
  const navigate = useCallback((action: () => void) => { if (dirty.current) setPendingNavigation({ action }); else action(); }, []);
  const uploadSync = useRef<ReturnType<typeof setTimeout>>(undefined);
  const markExpired = useCallback(() => setExpired(true), []);
  const reviews = usePdfReviews({ enabled: authorized, onUnauthorized: markExpired });
  const { sync } = reviews;
  const review = reviews.detail;
  const visible = review?.entries.filter(item => matchesFilter(item, filter) && (after ? item.decision !== "PENDING" : item.decision === "PENDING")) ?? [];
  const onUploaded = useCallback(() => { clearTimeout(uploadSync.current); uploadSync.current = setTimeout(() => void sync(), 600); }, [sync]);
  useEffect(() => () => clearTimeout(uploadSync.current), []);
  const uploads = useReviewUploads({ onUploaded, onUnauthorized: markExpired });
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => { if (dirty.current || uploads.rows.length) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", handler); return () => window.removeEventListener("beforeunload", handler);
  }, [uploads.rows.length]);
  const eventsState = usePdfExtractionEvents({ enabled: authorized, reconnectKey: eventsKey, sync });
  function openReview(id: ReviewKey) { navigate(() => { setFilter("ALL"); setAfter(false); setHome(false); reviews.open(id); }); }
  function created(next: ReviewDetail) { setFilter("ALL"); setAfter(false); setHome(false); reviews.created(next); }
  function manualRefresh() { setExpired(false); setEventsKey(value => value + 1); setDetailRefresh(value => value + 1); void reviews.refresh(); }
  const chips: { value: EntryFilter; label: string }[] = [{ value: "ALL", label: "전체 배역" },
    ...(review?.roles ?? []).map(role => ({ value: { roleId: role.id }, label: role.name })), { value: "NEEDS_CHECK", label: "배역 미일치" }];
  const filterKey = typeof filter === "object" ? String(filter.roleId) : filter;
  const uploadProps = { reviewId: review?.id ?? "", rows: uploads.rows, busy: uploads.busy,
    message: String(uploads.messageReviewId) === String(review?.id) ? uploads.message : "", disabled: expired,
    onChoose: (files: FileList | readonly File[] | null) => { if (review) uploads.choose(review.id, files, review.entries.length); },
    onUploadAll: () => { if (review) void uploads.uploadAll(review.id); }, onRetry: (row: typeof uploads.rows[number]) => void uploads.retry(row), onRemove: uploads.remove };
  return <div className={`${styles.root} ${home ? "" : `${styles.integrated} ${review?.entries.length ? styles.compactInbox : ""}`}`}
    onDragOver={event => { if (!home && event.dataTransfer.types.includes("Files")) { event.preventDefault(); event.dataTransfer.dropEffect = uploads.busy || expired ? "none" : "copy"; setDrag(!uploads.busy && !expired); } }}
    onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDrag(false); }}
    onDrop={event => { if (!home) { event.preventDefault(); setDrag(false); if (!uploads.busy && !expired) uploadProps.onChoose(event.dataTransfer.files); } }}
    onPaste={event => { if (!home && !(event.target as HTMLElement).closest('input,textarea,[contenteditable=true]') && event.clipboardData.files.length && !uploads.busy && !expired) { event.preventDefault(); uploadProps.onChoose(event.clipboardData.files); } }}>
    {drag && !!review?.entries.length && <div className={styles.dropOverlay}>PDF를 여기에 놓으세요</div>}
    {!authorized ? <ReviewLoginGate local={local} ready={sessionReady} /> : <>
      {expired && <SessionExpiredNotice local={local} onRecheck={manualRefresh} />}
      {eventsState === "DISCONNECTED" && <p role="status" className="p-3 text-sm text-muted-strong">자동 갱신 연결이 끊겼습니다. 목록 새로고침으로 다시 연결해 주세요.</p>}
      {home ? <div className={`${styles.home} ${styles.controls}`}>
        <p className={styles.eyebrow}>PDF 지원자 심사</p><h1>지원서는 한곳에,<br />심사는 바로 이어서.</h1>
        <p className={styles.description}>메일로 받은 PDF를 넣고 검토하세요. 한 명씩 추가하거나, 모아 둔 지원서를 한 번에 올릴 수 있습니다.</p>
        <ReviewCreateForm onCreated={created} onUnauthorized={markExpired} />
        <ReviewList reviews={reviews.reviews} selectedId={reviews.selectedId} loading={reviews.listLoading} error={reviews.listError} onSelect={openReview} onRetry={() => void reviews.refresh()} />
      </div> : !review ? <p role="status" className="p-8">{reviews.detailError || "심사함을 불러오고 있습니다…"}</p> : <>
        <div className={`${styles.controls} px-4 md:px-6 xl:px-8`}>
          <header className={styles.header}><div className={styles.inboxHeading}><button type="button" className={styles.homeLink} onClick={() => navigate(() => setHome(true))}>내 심사함</button><h1>{review.title}</h1><p>전체 {review.entries.length}명 <span>·</span> 심사 완료 {review.entries.filter(item => item.decision !== "PENDING").length}명</p></div>
            <button type="button" disabled={reviews.refreshing} onClick={manualRefresh} className="text-xs text-muted">{reviews.refreshing ? "불러오는 중…" : "목록 새로고침"}</button>
          </header>
          <ReviewUploadPanel {...uploadProps} inputRef={uploadInput}>
            <nav className={styles.roleBar} aria-label="배역별 지원자"><div className={styles.roleChips}>{chips.map(chip => {
              const key = typeof chip.value === "object" ? String(chip.value.roleId) : chip.value;
              return <button type="button" key={key} aria-pressed={filterKey === key} onClick={() => navigate(() => setFilter(chip.value))}>{chip.label}<span className="num">{review.entries.filter(item => matchesFilter(item, chip.value)).length}</span></button>;
            })}</div></nav>
          </ReviewUploadPanel>
          {filter === "NEEDS_CHECK" && <p className={styles.roleHint}>등록한 모집 배역과 연결되지 않은 지원자입니다. PDF의 지원 배역을 확인하고 ‘배역 변경’으로 연결해 주세요.</p>}
          {reviews.detailError && <p role="alert" className="text-fail">{reviews.detailError}</p>}
        </div>
        <div className="px-4 md:px-6 xl:px-8">
          <div className="mb-2 flex flex-wrap items-center gap-3 border-b border-border py-2">
            <div role="group" aria-label="심사 상태" className="flex gap-4">{[false,true].map(done => <button type="button" key={String(done)} aria-pressed={after === done} onClick={() => navigate(() => setAfter(done))} className={`min-h-10 border-b-2 text-sm font-semibold ${after === done ? "border-foreground" : "border-transparent text-muted"}`}>{done ? "심사 후" : "심사 전"} <span className="num ml-1">{review.entries.filter(item => done ? item.decision !== "PENDING" : item.decision === "PENDING").length}</span></button>)}</div>
            <div role="group" aria-label="보기 방식" className="flex overflow-hidden rounded-control border border-border">{([['single','한 명씩'],['card','카드'],['table','표']] as const).map(([value,label]) => <button type="button" key={value} aria-pressed={view === value} onClick={() => navigate(() => setView(value))} className={`min-h-10 px-4 text-sm font-semibold ${view === value ? "bg-foreground text-white" : "text-muted-strong"}`}>{label}</button>)}</div>
          </div>
          {!visible.length ? review.entries.length ? <div className={styles.emptyDrop}><h2>이 조건에 해당하는 지원자가 없습니다.</h2><p>배역이나 심사 상태를 바꿔 확인해 주세요.</p></div> :
            <button type="button" className={styles.uploadDropzone} data-dragging={drag} disabled={uploads.busy || expired} onClick={() => uploadInput.current?.click()} aria-labelledby="pdf-drop-title" aria-describedby="pdf-drop-description pdf-drop-limit">
              <span className={styles.dropIcon} aria-hidden="true"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M12 18v-7m-3 3 3-3 3 3" /></svg></span>
              <span id="pdf-drop-title" className={styles.dropTitle}>{uploads.busy ? "PDF를 올리고 있어요" : drag ? "여기에 놓으면 업로드가 시작돼요" : "지원자 PDF를 여기에 끌어 놓으세요"}</span>
              <span id="pdf-drop-description" className={styles.dropDescription}>{uploads.busy ? "준비된 지원자부터 바로 심사할 수 있어요." : "한 명씩, 또는 여러 명의 지원서를 한 번에 추가할 수 있어요."}</span>
              <span className={styles.dropChoose} aria-hidden="true">{uploads.busy ? "업로드 중…" : "파일 선택하기"}<span aria-hidden="true">{uploads.busy ? "" : "→"}</span></span>
              <span id="pdf-drop-limit" className={styles.dropLimit}>PDF · 한 번에 최대 300개 · 파일당 최대 25MiB</span>
            </button>
            : <ScreeningBoard key={`${review.id}-${filterKey}-${after}-${view}`} review={review} entries={visible} after={after} view={view} refreshKey={detailRefresh} onSaved={reviews.replaceEntry} onUnauthorized={markExpired} onDirtyChange={onDirtyChange} navigate={navigate} />}
        </div>
      </>}
    </>}
    <ModalShell open={pendingNavigation !== null} onClose={() => setPendingNavigation(null)} labelledBy="unsaved-review-title" className="w-[calc(100vw-32px)] max-w-md rounded-modal bg-card p-6 shadow-xl">
      <h2 id="unsaved-review-title" className="text-lg font-bold">저장하지 않은 메모가 있어요</h2><p className="mt-3 text-sm text-muted-strong">메모를 남겨두려면 취소 후 저장해 주세요.</p>
      <div className="mt-6 flex justify-end gap-2"><SecondaryButton onClick={() => setPendingNavigation(null)}>취소</SecondaryButton><PrimaryButton onClick={() => { const action = pendingNavigation?.action; dirty.current = false; setPendingNavigation(null); action?.(); }}>저장하지 않고 이동</PrimaryButton></div>
    </ModalShell>
  </div>;
}

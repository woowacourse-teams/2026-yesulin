"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuthSession } from "@/components/auth/auth-session";
import { ModalShell } from "@/components/auditions/modal-shell";
import { PrimaryButton, SecondaryButton } from "@/components/ui/controls";
import { matchesDecision, matchesFilter, type DecisionFilter, type EntryFilter, type ReviewDetail, type ReviewKey } from "@/features/pdf-reviews/types";
import { useReviewProgress } from "@/features/pdf-reviews/use-review-progress";
import { usePdfReviews } from "@/features/pdf-reviews/use-pdf-reviews";
import { useReviewUploads } from "@/features/pdf-reviews/use-review-uploads";
import { collectDroppedPdfs } from "@/features/pdf-reviews/upload-selection";
import { ReviewCreateForm } from "./review-create-form";
import { ReviewList } from "./review-list";
import { ReviewLoginGate, SessionExpiredNotice } from "./review-session";
import { ReviewUploadPanel } from "./review-upload-panel";
import { ReviewProcessingProgress } from "./review-processing-progress";
import { ScreeningBoard } from "./screening-board";
import { ReviewPassedContacts } from "./review-passed-contacts";
import styles from "./screening.module.css";

export function PdfReviewWorkbench({ local = false }: { readonly local?: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [creating, setCreating] = useState(false);
  const [createBusy, setCreateBusy] = useState(false);
  const createOpen = creating || searchParams.get("create") === "1";
  function closeCreate() {
    setCreating(false);
    if (searchParams.has("create")) {
      const query = new URLSearchParams(searchParams);
      query.delete("create");
      router.replace(`${pathname}${query.size ? `?${query}` : ""}`, { scroll: false });
    }
  }
  const { session, sessionReady } = useAuthSession();
  const authorized = session?.role === "PRODUCER";
  const [expired, setExpired] = useState(false);
  const [home, setHome] = useState(true);
  const [contactsOpen, setContactsOpen] = useState(false);
  const [filter, setFilter] = useState<EntryFilter>("ALL");
  const [decision, setDecision] = useState<DecisionFilter>("PENDING");
  const [view, setView] = useState<"single" | "card" | "table">("single");
  const [detailRefresh, setDetailRefresh] = useState(0);
  const [drag, setDrag] = useState(false);
  const [selectionError, setSelectionError] = useState("");
  const [collecting, setCollecting] = useState(false);
  const collectingRef = useRef(false);
  const uploadInput = useRef<HTMLInputElement>(null);
  const uploadFolderInput = useRef<HTMLInputElement>(null);
  const dirty = useRef(false);
  const onDirtyChange = useCallback((value: boolean) => { dirty.current = value; }, []);
  const [pendingNavigation, setPendingNavigation] = useState<{ action: () => void } | null>(null);
  const navigate = useCallback((action: () => void) => { if (dirty.current) setPendingNavigation({ action }); else action(); }, []);
  const uploadSync = useRef<ReturnType<typeof setTimeout>>(undefined);
  const markExpired = useCallback(() => setExpired(true), []);
  const reviews = usePdfReviews({ enabled: authorized, onUnauthorized: markExpired });
  const { sync } = reviews;
  const review = reviews.detail;
  const visible = review?.entries.filter(item => matchesFilter(item, filter) && matchesDecision(item, decision)) ?? [];
  const onUploaded = useCallback(() => { clearTimeout(uploadSync.current); uploadSync.current = setTimeout(() => void sync(), 600); }, [sync]);
  useEffect(() => () => clearTimeout(uploadSync.current), []);
  const uploads = useReviewUploads({ onUploaded, onUnauthorized: markExpired });
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => { if (dirty.current || uploads.rows.length) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", handler); return () => window.removeEventListener("beforeunload", handler);
  }, [uploads.rows.length]);
  const uploading = uploads.busy && String(uploads.messageReviewId) === String(review?.id);
  const { progress, error: progressError, recheck: recheckProgress } = useReviewProgress({
    reviewId: authorized && !home ? review?.id ?? null : null, uploading,
    refreshKey: `${detailRefresh}:${review?.entries.length ?? 0}`, onChanged: sync, onUnauthorized: markExpired,
  });
  const preparing = decision === "PENDING" && !expired && !progressError && !reviews.detailError && (uploading || (progress
    ? progress.total > 0 && !progress.complete
    : review?.entries.some(entry => entry.processingStatus === "UPLOADING" || entry.processingStatus === "EXTRACTING" || entry.processingStatus === "ENRICHING")));
  function openReview(id: ReviewKey) { navigate(() => { setContactsOpen(false); setFilter("ALL"); setDecision("PENDING"); setHome(false); reviews.open(id); }); }
  function created(next: ReviewDetail) { closeCreate(); setContactsOpen(false); setFilter("ALL"); setDecision("PENDING"); setHome(false); reviews.created(next); }
  function manualRefresh() { setExpired(false); setDetailRefresh(value => value + 1); void reviews.refresh(); }
  const chips: { value: EntryFilter; label: string }[] = review?.roles.length === 0
    ? [{ value: "ALL", label: "자유 배역" }]
    : [{ value: "ALL", label: "전체 배역" }, ...(review?.roles ?? []).map(role => ({ value: { roleId: role.id }, label: role.name })), { value: "NEEDS_CHECK", label: "미기재" }];
  const filterKey = typeof filter === "object" ? String(filter.roleId) : filter;
  const uploadProps = { busy: uploads.busy || collecting,
    disabled: expired,
    onChoose: (files: FileList | readonly File[] | null) => { setSelectionError(""); if (review) uploads.choose(review.id, files); },
  };
  async function dropFiles(transfer: DataTransfer) {
    if (!review || uploads.busy || expired || collectingRef.current) return;
    // 수집을 시작한 심사를 고정한다. 도중에 화면을 바꿔도 다른 심사에 파일을 올리지 않는다.
    const destinationId = review.id;
    collectingRef.current = true; setCollecting(true); setSelectionError("");
    try { uploads.choose(destinationId, await collectDroppedPdfs(transfer)); }
    catch (cause) { setSelectionError(cause instanceof Error ? cause.message : "폴더를 읽지 못했습니다. 다시 선택해 주세요."); }
    finally { collectingRef.current = false; setCollecting(false); }
  }
  const uploadMessage = String(uploads.messageReviewId) === String(review?.id) ? uploads.message : "";
  return <div className={`${styles.root} ${home ? "" : `${styles.integrated} ${review?.entries.length ? styles.compactInbox : ""}`}`}
    onDragOver={event => { if (!home && event.dataTransfer.types.includes("Files")) { event.preventDefault(); event.dataTransfer.dropEffect = uploadProps.busy || expired ? "none" : "copy"; setDrag(!uploadProps.busy && !expired); } }}
    onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDrag(false); }}
    onDrop={event => { if (!home) { event.preventDefault(); setDrag(false); void dropFiles(event.dataTransfer); } }}
    onPaste={event => { if (!home && !(event.target as HTMLElement).closest('input,textarea,[contenteditable=true]') && event.clipboardData.files.length && !uploadProps.busy && !expired) { event.preventDefault(); uploadProps.onChoose(event.clipboardData.files); } }}>
    {drag && !!review?.entries.length && <div className={styles.dropOverlay}>PDF를 여기에 놓으세요</div>}
    {!authorized ? <ReviewLoginGate local={local} ready={sessionReady} /> : <>
      {expired && <SessionExpiredNotice local={local} onRecheck={manualRefresh} />}
      {home ? <div className={`${styles.home} ${styles.controls}`}>
        <header className={styles.homeHeader}><h1>내 심사함</h1><PrimaryButton onClick={() => setCreating(true)} className={styles.primary}><span aria-hidden="true">+</span> 심사함 추가하기</PrimaryButton></header>
        <ReviewList reviews={reviews.reviews} selectedId={reviews.selectedId} loading={reviews.listLoading} error={reviews.listError} onSelect={openReview} onRetry={() => void reviews.refresh()} />
      </div> : !review ? <p role="status" className="p-8">{reviews.detailError || "심사함을 불러오고 있습니다…"}</p> : <>
        <div className={`${styles.controls} px-4 md:px-6 xl:px-8`}>
          <header className={styles.header}><nav className={styles.breadcrumb} aria-label="심사함 경로"><ol><li><button type="button" className={styles.homeLink} onClick={() => navigate(() => setHome(true))}>심사함</button></li><li aria-hidden="true" className={styles.breadcrumbSeparator}>›</li><li aria-current="page"><h1 title={review.title}>{review.title}</h1></li></ol></nav>
            <p className={styles.reviewCounts}><span>전체 <b className="num">{review.entries.length}</b>명</span><span>판정 완료 <b className="num">{review.entries.filter(item => item.decision === "PASS" || item.decision === "FAIL").length}</b>명</span></p>
          </header>
          {!contactsOpen && <ReviewUploadPanel {...uploadProps} inputRef={uploadInput} folderInputRef={uploadFolderInput}>
            <nav className={styles.roleBar} aria-label="배역별 지원자"><div className={styles.roleChips}>{chips.map(chip => {
              const key = typeof chip.value === "object" ? String(chip.value.roleId) : chip.value;
              return <button type="button" key={key} aria-pressed={filterKey === key} onClick={() => navigate(() => setFilter(chip.value))}>{chip.label}<span className="num">{review.entries.filter(item => matchesFilter(item, chip.value)).length}</span></button>;
            })}</div></nav>
          </ReviewUploadPanel>}
          {!contactsOpen && filter === "NEEDS_CHECK" && <p className={styles.roleHint}>심사 배역이 아직 지정되지 않은 지원자입니다. ‘배역 설정’에서 분류해 주세요.</p>}
          {selectionError && <p role="alert" className="text-sm text-fail">{selectionError}</p>}
          {reviews.detailError && <p role="alert" className="text-fail">{reviews.detailError}</p>}
        </div>
        <ReviewProcessingProgress key={review.id} inline={contactsOpen} progress={progress} uploading={uploading} uploadMessage={uploadMessage} uploadError={String(uploads.messageReviewId) === String(review.id) ? uploads.validationError : ""} error={progressError || reviews.detailError} onRetry={manualRefresh}
          notices={uploads.notices.filter(item => String(item.reviewId) === String(review.id))} rows={uploads.rows}
          uploadBusy={uploads.busy} disabled={expired} onRemove={uploads.remove} onClearUploaded={() => uploads.clearUploaded(review.id)} onRetryUpload={row => void uploads.retry(row)} />
        <div className="px-4 md:px-6 xl:px-8">
          {contactsOpen ? expired
            ? <p role="alert" className="py-8 text-sm text-fail">로그인이 만료되어 연락처를 숨겼습니다. 다시 로그인한 뒤 새로고침해 주세요.</p>
            : <ReviewPassedContacts key={review.id} reviewId={review.id} onDirtyChange={onDirtyChange} onBack={() => { setContactsOpen(false); void sync(); }} onUnauthorized={markExpired} /> : <>
          <div className={styles.boardToolbar}>
            <div role="group" aria-label="심사 상태" className={styles.decisionTabs}>{([['PENDING','대기'],['PASS','합격'],['HOLD','보류'],['FAIL','불합격']] as const).map(([value,label]) => <button type="button" key={value} aria-pressed={decision === value} onClick={() => navigate(() => setDecision(value))}>{label}<span className="num">{review.entries.filter(item => matchesFilter(item, filter) && matchesDecision(item, value)).length}</span></button>)}</div>
            <div className={styles.boardActions}>
            <div role="group" aria-label="보기 방식" className={styles.viewTabs}>{([['single','한 명씩'],['card','카드'],['table','표']] as const).map(([value,label]) => <button type="button" key={value} aria-pressed={view === value} onClick={() => navigate(() => setView(value))}>{label}</button>)}</div>
            <SecondaryButton disabled={expired} onClick={() => navigate(() => setContactsOpen(true))}>합격자 연락처</SecondaryButton>
            </div>
          </div>
          {!visible.length ? preparing ? <div className={styles.emptyDrop} role="status" aria-live="polite">
            <div aria-hidden="true" className="mx-auto mb-5 h-10 w-10 animate-spin rounded-full border-4 border-brand-soft border-t-brand motion-reduce:animate-none" />
            <h2>{uploading ? "PDF를 올리고 있어요" : "지원서를 준비하고 있어요"}</h2>
            <p>이미지 추출과 지원자 분석이 끝난 지원서부터 자동으로 표시됩니다.</p>
          </div> : review.entries.length ? <div className={styles.emptyDrop}><h2>이 조건에 해당하는 지원자가 없습니다.</h2><p>배역이나 심사 상태를 바꿔 확인해 주세요.</p></div> :
            <div className={styles.uploadDropzone} data-dragging={drag} aria-labelledby="pdf-drop-title" aria-describedby="pdf-drop-description pdf-drop-limit">
              <span className={styles.dropIcon} aria-hidden="true"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M12 18v-7m-3 3 3-3 3 3" /></svg></span>
              <span id="pdf-drop-title" className={styles.dropTitle}>{uploads.busy ? "PDF를 올리고 있어요" : drag ? "여기에 놓으면 업로드가 시작돼요" : "지원서 PDF나 폴더를 한 번에 끌어 놓으세요"}</span>
              <span id="pdf-drop-description" className={styles.dropDescription}>{uploads.busy ? "준비된 지원자부터 바로 심사할 수 있어요." : "여러 파일을 함께 선택하거나 폴더째 올릴 수 있어요. 폴더 안의 PDF만 가져옵니다."}</span>
              <div className="flex flex-wrap justify-center gap-3">
                <button type="button" className={styles.dropChoose} disabled={uploadProps.busy || expired} onClick={() => uploadInput.current?.click()}>파일 선택하기 <span aria-hidden="true">→</span></button>
                <button type="button" className={styles.dropChoose} disabled={uploadProps.busy || expired} onClick={() => uploadFolderInput.current?.click()}>폴더 선택하기 <span aria-hidden="true">→</span></button>
              </div>
              <span id="pdf-drop-limit" className={styles.dropLimit}>PDF · 한 번에 최대 300개 · 파일당 최대 25MiB</span>
            </div>
            : <ScreeningBoard key={`${review.id}-${filterKey}-${decision}-${view}`} review={review} entries={visible} decision={decision} view={view} refreshKey={detailRefresh} onSaved={reviews.replaceEntry} onUnauthorized={markExpired} onDirtyChange={onDirtyChange} onApplicantOpened={recheckProgress} navigate={navigate} />}
          </>}
        </div>
      </>}
    </>}

    <ModalShell open={authorized && createOpen} onClose={() => { if (!createBusy) closeCreate(); }} labelledBy="create-review-title" className={`${styles.createDialog} ${styles.controls} w-[calc(100vw-32px)] max-w-lg max-h-[90dvh] overflow-y-auto rounded-modal bg-card p-6 shadow-xl`}>
      <header className="flex items-center justify-between gap-3"><h2 id="create-review-title" className="text-lg font-bold">심사함 추가하기</h2><SecondaryButton onClick={closeCreate} disabled={createBusy} aria-label="심사함 추가 닫기">닫기</SecondaryButton></header>
      {createOpen && <ReviewCreateForm onCreated={created} onUnauthorized={markExpired} onBusyChange={setCreateBusy} />}
    </ModalShell>
    <ModalShell open={pendingNavigation !== null} onClose={() => setPendingNavigation(null)} labelledBy="unsaved-review-title" className="w-[calc(100vw-32px)] max-w-md rounded-modal bg-card p-6 shadow-xl">
      <h2 id="unsaved-review-title" className="text-lg font-bold">저장하지 않은 메모가 있어요</h2><p className="mt-3 text-sm text-muted-strong">메모를 남겨두려면 취소 후 저장해 주세요.</p>
      <div className="mt-6 flex justify-end gap-2"><SecondaryButton onClick={() => setPendingNavigation(null)}>취소</SecondaryButton><PrimaryButton onClick={() => { const action = pendingNavigation?.action; dirty.current = false; setPendingNavigation(null); action?.(); }}>저장하지 않고 이동</PrimaryButton></div>
    </ModalShell>
  </div>;
}

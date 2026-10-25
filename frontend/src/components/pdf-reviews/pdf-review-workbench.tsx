"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthSession } from "@/components/auth/auth-session";
import { ModalShell } from "@/components/auditions/modal-shell";
import { FilterChip, PrimaryButton, SecondaryButton } from "@/components/ui/controls";
import { assignPdfReviewRoles, isUnauthorized } from "@/features/pdf-reviews/api";
import { decisionLabels, matchesFilter, matchStatusLabels, sameKey, type EntryFilter, type ReviewDetail, type ReviewKey } from "@/features/pdf-reviews/types";
import { usePdfExtractionEvents } from "@/features/pdf-reviews/use-extraction-events";
import { usePdfReviews } from "@/features/pdf-reviews/use-pdf-reviews";
import { useReviewUploads } from "@/features/pdf-reviews/use-review-uploads";
import { ReviewCreateForm } from "./review-create-form";
import { ReviewEntryDetail } from "./review-entry-detail";
import { ReviewList } from "./review-list";
import { ReviewLoginGate, SessionExpiredNotice } from "./review-session";
import { ReviewUploadPanel } from "./review-upload-panel";

export function PdfReviewWorkbench({ local = false }: { readonly local?: boolean }) {
  const { session, sessionReady } = useAuthSession();
  const authorized = session?.role === "PRODUCER";
  const [expired, setExpired] = useState(false);
  const [home, setHome] = useState(true);
  const [filter, setFilter] = useState<EntryFilter>("ALL");
  const [after, setAfter] = useState(false);
  const [view, setView] = useState<"single" | "card" | "table">("single");
  const [entryId, setEntryId] = useState<ReviewKey | null>(null);
  const [detailRefresh, setDetailRefresh] = useState(0);
  const [eventsKey, setEventsKey] = useState(0);
  const [selected, setSelected] = useState<ReviewKey[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [assignError, setAssignError] = useState("");
  const dirty = useRef(false);
  const onDirtyChange = useCallback((value: boolean) => { dirty.current = value; }, []);
  const [pendingNavigation, setPendingNavigation] = useState<{ action: () => void } | null>(null);
  function navigate(action: () => void) {
    if (dirty.current) setPendingNavigation({ action });
    else action();
  }
  const uploadSync = useRef<ReturnType<typeof setTimeout>>(undefined);
  const markExpired = useCallback(() => setExpired(true), []);
  const reviews = usePdfReviews({ enabled: authorized, onUnauthorized: markExpired });
  const { sync } = reviews;
  const review = reviews.detail;
  const visible = review?.entries.filter(item => matchesFilter(item, filter) && (after ? item.decision !== "PENDING" : item.decision === "PENDING")) ?? [];
  const entry = visible.find(item => sameKey(item.id, entryId)) ?? visible[0] ?? null;
  const index = entry ? visible.indexOf(entry) : -1;
  const onUploaded = useCallback(() => {
    clearTimeout(uploadSync.current);
    uploadSync.current = setTimeout(() => void sync(), 600);
  }, [sync]);
  useEffect(() => () => clearTimeout(uploadSync.current), []);
  const uploads = useReviewUploads({ onUploaded, onUnauthorized: markExpired });
  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (dirty.current || uploads.rows.length) { event.preventDefault(); event.returnValue = ""; }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [uploads.rows.length]);
  const eventsState = usePdfExtractionEvents({ enabled: authorized, reconnectKey: eventsKey,
    sync: async completedJobIds => {
      await sync();
      if (entry && completedJobIds.includes(entry.jobId)) setDetailRefresh(value => value + 1);
    },
  });
  function openReview(id: ReviewKey) {
    navigate(() => {
      setFilter("ALL"); setEntryId(null); setAfter(false); setSelected([]); setHome(false);
      reviews.open(id);
    });
  }
  function created(next: ReviewDetail) {
    setFilter("ALL"); setEntryId(null); setAfter(false); setSelected([]); setHome(false);
    reviews.created(next);
  }
  function manualRefresh() {
    setExpired(false); setEventsKey(value => value + 1); setDetailRefresh(value => value + 1);
    void reviews.refresh();
  }
  function changeFilter(value: EntryFilter) {
    navigate(() => { setFilter(value); setEntryId(null); setSelected([]); });
  }
  async function assignRoles(roleId: string) {
    if (!review || !selected.length || assigning) return;
    setAssigning(true); setAssignError("");
    try {
      const changed = await assignPdfReviewRoles(review.id, selected, roleId || null);
      changed.forEach(reviews.replaceEntry); setSelected([]);
    } catch (cause) {
      if (isUnauthorized(cause)) markExpired();
      setAssignError(cause instanceof Error ? cause.message : "배역을 변경하지 못했습니다.");
    } finally { setAssigning(false); }
  }
  const chips: { value: EntryFilter; label: string }[] = [{ value: "ALL", label: "전체 배역" },
    ...(review?.roles ?? []).map(role => ({ value: { roleId: role.id }, label: role.name })),
    { value: "NEEDS_CHECK", label: "배역 미일치" }, { value: "WAITING", label: "정리 중" }];
  const sameFilter = (a: EntryFilter, b: EntryFilter) => typeof a === "object" && typeof b === "object" ? sameKey(a.roleId, b.roleId) : a === b;

  return <div className="min-h-screen bg-card px-4 py-4 text-foreground md:px-7">
    <div className="mx-auto max-w-[1560px]">
      <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">{!home ? <button type="button" onClick={() => navigate(() => setHome(true))} className="min-h-11 text-sm text-muted-strong">← 내 심사함</button> : null}
          <h1 className="text-xl font-bold tracking-tight">{home ? "PDF 지원자 심사" : review?.title ?? "심사함 불러오는 중…"}</h1></div>
        {authorized ? <button type="button" disabled={reviews.refreshing} onClick={manualRefresh} className="min-h-11 text-xs text-muted-strong">{reviews.refreshing ? "불러오는 중…" : "목록 새로고침"}</button> : null}
      </header>
      {!authorized ? <ReviewLoginGate local={local} ready={sessionReady} /> : <>
        {expired ? <SessionExpiredNotice local={local} onRecheck={manualRefresh} /> : null}
        {eventsState === "DISCONNECTED" ? <p role="status" className="mb-3 text-sm text-muted-strong">자동 갱신 연결이 끊겼습니다. 목록 새로고침으로 다시 연결해 주세요.</p> : null}
        {home ? <>
          <p className="mb-6 text-sm text-muted-strong">이메일로 받은 PDF 지원서를 한곳에 모아 배역별로 심사하세요.</p>
          <div className="grid items-start gap-6 lg:grid-cols-[minmax(300px,420px)_minmax(0,1fr)]">
            <ReviewCreateForm onCreated={created} onUnauthorized={markExpired} />
            <ReviewList reviews={reviews.reviews} selectedId={reviews.selectedId} loading={reviews.listLoading} error={reviews.listError} onSelect={openReview} onRetry={() => void reviews.refresh()} />
          </div>
          {local ? <p className="mt-6 text-xs leading-6 text-muted-strong">로컬 검증 환경입니다. AI 연결 여부에 따라 프로필 일부가 미확인일 수 있습니다. 외부 AI 연결 시험에는 가상 지원서를 사용하세요.</p> : null}
        </> : !review ? <p role="status" className="p-8 text-sm text-muted-strong">{reviews.detailError || "심사함을 불러오고 있습니다…"}</p> : <>
          {reviews.detailError ? <p role="alert" className="mb-3 text-sm text-fail">{reviews.detailError}</p> : null}
          <ReviewUploadPanel reviewId={review.id} rows={uploads.rows} busy={uploads.busy} message={sameKey(uploads.messageReviewId, review.id) ? uploads.message : ""} disabled={expired}
            onChoose={files => uploads.choose(review.id, files, review.entries.length)} onUploadAll={() => void uploads.uploadAll(review.id)}
            onRetry={row => void uploads.retry(row)} onRemove={uploads.remove} />
          <div role="group" aria-label="배역별 보기" className="my-2 flex flex-wrap gap-2">
            {chips.map(chip => <FilterChip key={typeof chip.value === "object" ? String(chip.value.roleId) : chip.value}
              pressed={sameFilter(filter, chip.value)} onClick={() => changeFilter(chip.value)}>
              {chip.label} <span className="num ml-1">{review.entries.filter(item => matchesFilter(item, chip.value)).length}</span>
            </FilterChip>)}
          </div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-2">
            <div role="group" aria-label="심사 상태" className="flex gap-5">
              {[false, true].map(done => <button type="button" key={String(done)} aria-pressed={after === done} onClick={() => navigate(() => { setAfter(done); setEntryId(null); setSelected([]); })} className={`min-h-10 border-b-2 text-sm font-semibold ${after === done ? "border-foreground" : "border-transparent text-muted"}`}>
                {done ? "심사 후" : "심사 전"} {review.entries.filter(item => done ? item.decision !== "PENDING" : item.decision === "PENDING").length}
              </button>)}
            </div>
            <div role="group" aria-label="보기 방식" className="flex rounded-control border border-border p-1">
              {([['single', '한 명씩'], ['card', '카드'], ['table', '표']] as const).map(([value, label]) => <button type="button" key={value} aria-pressed={view === value} onClick={() => navigate(() => setView(value))} className={`min-h-9 rounded-control px-4 text-sm ${view === value ? "bg-foreground text-white" : "text-muted-strong"}`}>{label}</button>)}
            </div>
          </div>
          {!visible.length ? <div role="status" className="rounded-2xl bg-surface p-12 text-center text-sm text-muted-strong">{review.entries.length ? "이 조건에 해당하는 지원자가 없습니다." : "위의 PDF 추가 버튼으로 지원서를 올려 주세요."}</div>
            : view === "single" && entry ? <ReviewEntryDetail key={String(entry.id)} review={review} entry={entry} refreshKey={detailRefresh} onSaved={reviews.replaceEntry} onUnauthorized={markExpired}
              onDirtyChange={onDirtyChange} position={`${index + 1} / ${visible.length}`} hasPrevious={index > 0} hasNext={index < visible.length - 1}
              onPrevious={() => navigate(() => setEntryId(visible[index - 1].id))} onNext={() => navigate(() => setEntryId(visible[index + 1].id))} />
              : <section aria-label="지원자 목록">
                <div className="mb-3 flex flex-wrap items-center gap-3 text-sm">
                  <label className="flex min-h-11 items-center gap-2"><input type="checkbox" checked={selected.length === Math.min(visible.length, 300)} onChange={event => setSelected(event.target.checked ? visible.slice(0, 300).map(item => item.id) : [])} />{visible.length > 300 ? "앞 300명 선택" : "전체 선택"}</label>
                  <span>{selected.length}명 선택</span>
                  <select aria-label="선택한 지원자 배역 변경" value="choose" disabled={!selected.length || assigning} onChange={event => void assignRoles(event.target.value)} className="min-h-11 rounded-control border border-border bg-card px-3">
                    <option value="choose" disabled>배역 변경</option><option value="">배역 미일치</option>{review.roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}
                  </select>
                </div>
                {assignError ? <p role="alert" className="mb-3 text-sm text-fail">{assignError}</p> : null}
                <ul className={view === "card" ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-4" : "divide-y divide-border rounded-card border border-border"}>
                  {visible.map(item => <li key={item.id} className={`flex items-start gap-3 p-4 ${view === "card" ? "rounded-card border border-border" : ""}`}>
                    <input type="checkbox" aria-label={`${item.applicantName || item.originalFilename} 선택`} className="mt-2" checked={selected.some(key => sameKey(key, item.id))} disabled={assigning} onChange={event => setSelected(current => event.target.checked ? [...current, item.id].slice(0, 300) : current.filter(key => !sameKey(key, item.id)))} />
                    <button type="button" onClick={() => { setEntryId(item.id); setView("single"); }} className="min-w-0 flex-1 text-left">
                      <span className="font-bold">{item.applicantName || "이름 미확인"}</span><span className="ml-2 text-xs text-muted-strong">{decisionLabels[item.decision]}</span>
                      <span className="mt-1 block text-sm text-muted-strong">{review.roles.find(role => sameKey(role.id, item.roleId))?.name ?? matchStatusLabels[item.matchStatus]}</span>
                      <span className="mt-2 block truncate text-xs text-muted" title={item.originalFilename}>{item.originalFilename}</span>
                    </button>
                  </li>)}
                </ul>
              </section>}
        </>}
      </>}
    </div>
    <ModalShell open={pendingNavigation !== null} onClose={() => setPendingNavigation(null)} labelledBy="pdf-review-leave-title" className="w-[min(440px,92vw)] rounded-2xl bg-card p-6 shadow-xl">
      <h2 id="pdf-review-leave-title" className="text-lg font-bold">저장하지 않은 메모가 있어요</h2>
      <p className="mt-3 text-sm leading-6 text-muted-strong">이동하면 작성 중인 메모가 사라집니다. 저장한 심사 기록은 그대로 유지됩니다.</p>
      <div className="mt-5 flex justify-end gap-2">
        <SecondaryButton onClick={() => setPendingNavigation(null)}>계속 작성</SecondaryButton>
        <PrimaryButton onClick={() => { const pending = pendingNavigation; setPendingNavigation(null); dirty.current = false; pending?.action(); }}>저장하지 않고 이동</PrimaryButton>
      </div>
    </ModalShell>
  </div>;
}

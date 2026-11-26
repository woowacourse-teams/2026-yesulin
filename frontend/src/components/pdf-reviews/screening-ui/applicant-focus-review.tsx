"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { startReviewTimer } from "@/features/analytics/review-timer";
import type { ReviewInput } from "@/features/analytics/review-actions";
import type { Applicant } from "@/features/pdf-reviews/screening-types";
import { useReviewAutosave } from "@/features/pdf-reviews/use-review-autosave";
import { SecondaryButton } from "@/components/ui/controls";
import type { PdfPagerState } from "@/components/pdf-extractions/pdf-pager";
import { ReviewRoleSelect } from "../review-role-select";
import { useBoard } from "./board-context";
import { FullscreenCaption } from "./fullscreen-caption";
import { decisionOptions, FullscreenDock, type DecidedStatus } from "./fullscreen-dock";

const shortcutDecisions: Readonly<Record<string, DecidedStatus>> = Object.fromEntries(decisionOptions.map(option => [option.code, option.status]));
export const DECISION_STAMP_MS = 400;
const decisionColors: Readonly<Record<DecidedStatus, string>> = { FAIL: "border-fail text-fail", ETC: "border-border text-muted-strong", PASS: "border-brand text-brand" };

export function ApplicantFocusReview({ rows, applicant, onMove }: { readonly rows: readonly Applicant[]; readonly applicant: Applicant; readonly onMove: (id: string) => void }) {
  const [documentExpanded, setDocumentExpanded] = useState(false);
  return <FocusReviewContent key={applicant.id} applicant={applicant} rows={rows} index={rows.indexOf(applicant)} onMove={onMove}
    documentExpanded={documentExpanded} onDocumentExpandedChange={setDocumentExpanded} />;
}

type ContentProps = {
  readonly applicant: Applicant; readonly rows: readonly Applicant[]; readonly index: number;
  readonly onMove: (id: string) => void;
  readonly documentExpanded: boolean; readonly onDocumentExpandedChange: (expanded: boolean) => void;
};

function FocusReviewContent({ applicant, rows, index, onMove, documentExpanded, onDocumentExpandedChange }: ContentProps) {
  const boardState = useBoard();
  const { reviewId, saveError, requestNavigation, onNoteDirty, onApplicantOpened, onBasicAction, saving, reviewLocked, reviewFocused, renderDocument, roleOptions, currentRole, changeRole, saveMemo, registerNavigationSave, pagerSlot, lastDecision, onLastDecisionChange } = boardState;
  const [deciding, setDeciding] = useState(false);
  const [stamp, setStamp] = useState<DecidedStatus | null>(null);
  const decisionPending = useRef(false);
  const section = useRef<HTMLElement>(null);
  const focusSection = useEffectEvent(() => { if (!documentExpanded) section.current?.focus({ preventScroll: true }); });
  useEffect(() => { focusSection(); }, [applicant.id]);
  const draft = useReviewAutosave({ title: applicant.sourceDocument?.title ?? "", memo: applicant.review.note },
    (field, value) => {
      if (field === "memo" && saveMemo) return saveMemo(applicant.id, value);
      return Promise.resolve(null);
    }, dirty => onNoteDirty?.(dirty));
  const { flush } = draft;
  const flushBeforeNavigation = useCallback(async () => {
    if (saving || decisionPending.current) return false;
    return flush();
  }, [saving, flush]);
  useEffect(() => registerNavigationSave?.(flushBeforeNavigation), [registerNavigationSave, flushBeforeNavigation]);
  const openApplicant = useEffectEvent(() => onApplicantOpened?.());
  useEffect(() => { openApplicant(); }, [applicant.id]);
  useEffect(() => startReviewTimer({ metric_version: 2, workflow: "producer_pdf", review_id: reviewId, item_id: applicant.id }), [reviewId, applicant.id]);
  const heading = applicant.name;
  const move = useCallback(async (target: Applicant | undefined, input: ReviewInput = "button") => {
    if (!target || saving || decisionPending.current) return;
    let actionType: "previous" | "next" = "next";
    if (rows.indexOf(target) < index) actionType = "previous";
    onBasicAction?.(target.id, actionType, input);
    if (!await flush()) return;
    const action = () => onMove(target.id);
    if (!requestNavigation) { action(); return; }
    requestNavigation(action);
  }, [saving, onBasicAction, onMove, requestNavigation, flush, rows, index]);
  const runDecision = useCallback(async (work: () => Promise<void>) => {
    if (saving || reviewLocked || decisionPending.current) return;
    decisionPending.current = true; setDeciding(true);
    try { if (await flush()) await work(); }
    finally { decisionPending.current = false; setDeciding(false); }
  }, [saving, reviewLocked, flush]);
  const save = useCallback((status: DecidedStatus, input: ReviewInput = "button") => runDecision(async () => {
    onBasicAction?.(applicant.id, "decision_save", input);
    const updated = await withStamp(documentExpanded, status, setStamp, () => reviewFocused(applicant.id, status, undefined, draft.memo));
    if (!updated) return;
    onLastDecisionChange({ id: applicant.id, previous: applicant.review.status });
    if (!updated.applicants.some(row => row.id === applicant.id) && updated.applicants.length) onMove(updated.applicants[Math.min(index, updated.applicants.length - 1)].id);
  }), [runDecision, onBasicAction, applicant.id, applicant.review.status, documentExpanded, reviewFocused, draft.memo, onLastDecisionChange, index, onMove]);
  const undo = useCallback((input: ReviewInput) => runDecision(async () => {
    if (!lastDecision) return;
    onBasicAction?.(lastDecision.id, "decision_undo", input);
    if (!await reviewFocused(lastDecision.id, lastDecision.previous)) return;
    onLastDecisionChange(null);
    onMove(lastDecision.id);
  }), [runDecision, lastDecision, onBasicAction, reviewFocused, onLastDecisionChange, onMove]);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (!reviewShortcut(event)) return;
      const decision = shortcutDecisions[event.code];
      if (decision && !saving && !reviewLocked) { event.preventDefault(); void save(decision, "shortcut"); }
      if (event.code === "KeyN" && rows[index + 1]) { event.preventDefault(); void move(rows[index + 1], "shortcut"); }
      if (event.code === "KeyZ" && lastDecision) { event.preventDefault(); void undo("shortcut"); }
    };
    window.addEventListener("keydown", keyboard); return () => window.removeEventListener("keydown", keyboard);
  }, [saving, reviewLocked, save, rows, index, move, lastDecision, undo]);
  const disabled = saving || deciding;
  const navigate = async (action: () => void) => { if (!await flush()) return; if (requestNavigation) { requestNavigation(action); return; } action(); };
  const errorIds: { memo?: string } = {};
  if (draft.errorField === "memo") errorIds.memo = "pdf-review-save-error";
  const dock = (pager: PdfPagerState | null) => <FullscreenDock pager={pager} current={applicant.review.status} stamp={stamp} disabled={disabled || reviewLocked} onDecide={status => void save(status)} />;
  const pager = <nav aria-label="지원서 이동" className="flex shrink-0 items-center justify-between gap-2">
    <SecondaryButton aria-label="이전 지원서" disabled={!rows[index - 1] || disabled} onClick={() => void move(rows[index - 1])}>← 이전</SecondaryButton>
    <span className="num whitespace-nowrap text-sm text-muted-strong">{index + 1} / {rows.length}</span>
    <SecondaryButton aria-label="다음 지원서" disabled={!rows[index + 1] || disabled} onClick={() => void move(rows[index + 1])}>다음 →</SecondaryButton>
  </nav>;
  return <section ref={section} tabIndex={-1} aria-label={`${heading}, 지원자 ${index + 1} / ${rows.length} 심사`} className="pb-8 outline-none">
    {placePager(pager, pagerSlot)}
    <div className="grid min-w-0 items-start gap-4 md:grid-cols-[minmax(0,1fr)_240px] xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 overflow-hidden rounded-card border border-border bg-card">{renderDocument?.(applicant, { expanded: documentExpanded, onExpandedChange: onDocumentExpandedChange, dock,
        caption: <FullscreenCaption name={heading} status={applicant.review.status} position={index + 1} total={rows.length} error={fullscreenError(draft, saveError)} /> })}</div>
      <aside className="min-w-0 space-y-5 rounded-card border border-border bg-card p-4 md:sticky md:top-20 md:z-10 md:max-h-[calc(100dvh-6rem)] lg:top-4 lg:max-h-[calc(100dvh-2rem)] md:overflow-y-auto md:overscroll-contain" aria-label="지원자 심사">
        {!!roleOptions?.length && changeRole && <ReviewRoleSelect label="배역 배정" roles={roleOptions} value={currentRole?.(applicant.id) ?? null} disabled={disabled} onChange={roleId => void navigate(() => changeRole(applicant.id, roleId))} />}
        <div><label htmlFor="pdf-review-memo" className="mb-2 block text-sm font-semibold">내부 메모</label><textarea aria-invalid={draft.errorField === "memo"} aria-describedby={errorIds.memo} id="pdf-review-memo" value={draft.memo} maxLength={500} disabled={disabled || reviewLocked} rows={10} onChange={event => draft.change("memo", event.target.value)} onBlur={() => void flush()} onCompositionStart={() => draft.compose("memo", true)} onCompositionEnd={event => draft.compose("memo", false, event.currentTarget.value)} className="h-56 w-full resize-y md:h-[clamp(14rem,36dvh,24rem)] rounded-control border border-border bg-surface p-3 text-sm" /></div>
        {draft.status === "error" && <div id="pdf-review-save-error" role="alert" className="text-xs text-fail"><span>{draft.error}</span><button type="button" onClick={() => void flush()} className="mt-1 block min-h-11 text-sm font-semibold text-brand">저장 재시도</button></div>}
        <div role="group" aria-label="지원자 심사 판정" className="sticky bottom-0 -mx-4 -mb-4 grid grid-cols-3 gap-2 rounded-b-card border-t border-border-soft bg-card p-4 md:static md:m-0 md:border-0 md:p-0">{decisionOptions.map(option => <button key={option.status} type="button" aria-label={`${option.label} (${option.key})`} aria-pressed={applicant.review.status === option.status} disabled={disabled || reviewLocked} onClick={() => void save(option.status)} className={`flex min-h-12 items-center justify-center gap-1.5 rounded-control border bg-card px-2 py-3 text-sm font-bold hover:bg-surface aria-pressed:bg-surface aria-pressed:ring-2 aria-pressed:ring-current disabled:opacity-50 ${decisionColors[option.status]}`}>{option.label}<kbd aria-hidden="true" className="hidden rounded border border-current px-1 text-[11px] font-semibold opacity-60 xl:inline">{option.key}</kbd></button>)}</div>
        <p className="hidden text-xs text-muted md:block"><kbd className="rounded border border-border px-1 font-semibold">N</kbd> 다음 지원서 <kbd className="ml-2 rounded border border-border px-1 font-semibold">Z</kbd> 직전 판정 취소</p>
      </aside>
    </div>
  </section>;
}

function placePager(pager: ReactNode, slot: HTMLElement | null | undefined) {
  if (!slot) return <div className="mb-3 flex justify-end">{pager}</div>;
  return createPortal(pager, slot);
}

function reviewShortcut(event: KeyboardEvent) {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.repeat || event.isComposing) return false;
  if (document.querySelector('[role="dialog"][aria-modal="true"]:not([data-fullscreen-viewer])')) return false;
  return !(event.target instanceof HTMLElement && event.target.closest('input,textarea,select,button,a,[role="combobox"],[contenteditable=true]'));
}

/**
 * 전체화면에서는 판정 도장을 잠깐 보여 준 뒤 저장한다. 저장하면 지원서가 목록에서 바로 빠지므로 도장을 먼저 보여야 한다.
 * 기본 보기는 기다리지 않는다.
 */
async function withStamp<T>(expanded: boolean, status: DecidedStatus, setStamp: (status: DecidedStatus | null) => void, save: () => Promise<T>) {
  if (!expanded) return save();
  setStamp(status);
  await new Promise(resolve => setTimeout(resolve, DECISION_STAMP_MS));
  try { return await save(); }
  finally { setStamp(null); }
}

function fullscreenError(draft: { readonly status: string; readonly error?: string | null }, saveError?: string) {
  if (draft.status === "error") return draft.error || "자동 저장하지 못했습니다.";
  return saveError;
}


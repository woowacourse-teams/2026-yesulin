"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { startReviewTimer } from "@/features/analytics/review-timer";
import type { ReviewInput } from "@/features/analytics/review-actions";
import type { Applicant, ReviewStatus } from "@/features/pdf-reviews/screening-types";
import { useReviewAutosave } from "@/features/pdf-reviews/use-review-autosave";
import { SecondaryButton } from "@/components/ui/controls";
import { ReviewDocumentHeading } from "../review-document-heading";
import { ReviewRoleSelect } from "../review-role-select";
import { useBoard } from "./board-context";

export function ApplicantFocusReview({ rows, onBack, initialId }: { readonly rows: readonly Applicant[]; readonly onBack?: () => void; readonly initialId?: string }) {
  const [activeId, setActiveId] = useState(initialId ?? rows[0]?.id ?? null);
  const applicant = rows.find(row => row.id === activeId) ?? rows[0];
  if (!applicant) return null;
  return <FocusReviewContent key={applicant.id} applicant={applicant} rows={rows} index={rows.indexOf(applicant)} onBack={onBack} onMove={id => setActiveId(id)} />;
}

function FocusReviewContent({ applicant, rows, index, onBack, onMove }: {
  readonly applicant: Applicant; readonly rows: readonly Applicant[]; readonly index: number;
  readonly onBack?: () => void; readonly onMove: (id: string) => void;
}) {
  const boardState = useBoard();
  const { board, requestNavigation, onNoteDirty, onApplicantOpened, onBasicAction, saving, reviewLocked, reviewFocused, renderDocument, roleOptions, currentRole, changeRole, renameTitle, saveMemo, registerNavigationSave } = boardState;
  const [deciding, setDeciding] = useState(false);
  const decisionPending = useRef(false);
  const section = useRef<HTMLElement>(null);
  useEffect(() => { section.current?.focus({ preventScroll: true }); }, [applicant.id]);
  const draft = useReviewAutosave({ title: applicant.sourceDocument?.title || applicant.sourceDocument?.filename || applicant.name, memo: applicant.review.note },
    (field, value) => {
      if (field === "title" && renameTitle) return renameTitle(applicant.id, value);
      if (field === "memo" && saveMemo) return saveMemo(applicant.id, value);
      return Promise.resolve(null);
    }, dirty => onNoteDirty?.(dirty));
  const { flush } = draft;
  useEffect(() => registerNavigationSave?.(flush), [registerNavigationSave, flush]);
  useEffect(() => { onApplicantOpened?.(); }, [applicant.id, onApplicantOpened]);
  useEffect(() => startReviewTimer({ metric_version: 2, workflow: "producer_pdf", review_id: String(board.role.id), item_id: String(applicant.id) }), [board.role.id, applicant.id]);
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
  const save = useCallback(async (status: ReviewStatus, input: ReviewInput = "button") => {
    if (saving || reviewLocked || decisionPending.current) return;
    decisionPending.current = true; setDeciding(true);
    try {
      if (!await flush()) return;
      onBasicAction?.(applicant.id, "decision_save", input);
      const updated = await reviewFocused(applicant.id, status, undefined, draft.memo);
      if (!updated) return;
      if (!updated.applicants.some(row => row.id === applicant.id) && updated.applicants.length) onMove(updated.applicants[Math.min(index, updated.applicants.length - 1)].id);
    } finally { decisionPending.current = false; setDeciding(false); }
  }, [saving, reviewLocked, onBasicAction, applicant.id, reviewFocused, draft.memo, index, onMove, flush]);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.repeat || event.isComposing) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      if (event.target instanceof HTMLElement && event.target.closest('input,textarea,select,button,a,[role="combobox"],[contenteditable=true]')) return;
      const key = event.key.toLowerCase();
      const decisions: Record<string, ReviewStatus> = { a: "PASS", s: "ETC", d: "FAIL" };
      if (decisions[key] && !saving && !reviewLocked) { event.preventDefault(); void save(decisions[key], "shortcut"); }
      if (key === "n" && rows[index + 1]) { event.preventDefault(); void move(rows[index + 1], "shortcut"); }
    };
    window.addEventListener("keydown", keyboard); return () => window.removeEventListener("keydown", keyboard);
  }, [saving, reviewLocked, save, rows, index, move]);
  const disabled = saving || deciding;
  const navigate = async (action: () => void) => { if (!await flush()) return; if (requestNavigation) { requestNavigation(action); return; } action(); };
  return <section ref={section} tabIndex={-1} aria-label={`${applicant.name} · 지원자 ${index + 1} / ${rows.length} 심사`} className="pb-8 outline-none">
    <header className="mb-3 flex flex-col gap-2 px-1 md:flex-row md:items-center md:justify-between">
      <ReviewDocumentHeading title={draft.title} disabled={disabled} onChange={value => draft.change("title", value)} onBlur={() => void flush()} onCompositionStart={() => draft.compose("title", true)} onCompositionEnd={value => draft.compose("title", false, value)} />
      <nav aria-label="지원서 이동" className="flex shrink-0 items-center justify-between gap-2">
        {onBack && <SecondaryButton disabled={disabled} onClick={() => void navigate(onBack)}>목록</SecondaryButton>}
        <SecondaryButton aria-label="이전 지원서" disabled={!rows[index - 1] || disabled} onClick={() => void move(rows[index - 1])}>← 이전</SecondaryButton>
        <span className="num whitespace-nowrap text-sm text-muted-strong">{index + 1} / {rows.length}</span>
        <SecondaryButton aria-label="다음 지원서" disabled={!rows[index + 1] || disabled} onClick={() => void move(rows[index + 1])}>다음 →</SecondaryButton>
      </nav>
    </header>
    <div className="grid min-w-0 items-start gap-4 md:grid-cols-[minmax(0,1fr)_240px] xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 overflow-hidden rounded-card border border-border bg-card">{renderDocument?.(applicant)}</div>
      <aside className="min-w-0 space-y-5 rounded-card border border-border bg-card p-4 md:sticky md:top-4" aria-label="지원자 심사">
        {!!roleOptions?.length && changeRole && <ReviewRoleSelect label="배역 배정" roles={roleOptions} value={currentRole?.(applicant.id) ?? null} disabled={disabled} onChange={roleId => void navigate(() => changeRole(applicant.id, roleId))} />}
        <div><label htmlFor="pdf-review-memo" className="mb-2 block text-sm font-semibold">내부 메모</label><textarea id="pdf-review-memo" value={draft.memo} maxLength={2000} disabled={disabled || reviewLocked} rows={8} onChange={event => draft.change("memo", event.target.value)} onBlur={() => void flush()} onCompositionStart={() => draft.compose("memo", true)} onCompositionEnd={event => draft.compose("memo", false, event.currentTarget.value)} className="w-full resize-y rounded-control border border-border bg-surface p-3 text-sm" /></div>
        <div role="status" aria-live="polite" className="min-h-5 text-xs text-muted">
          {draft.status === "pending" && "저장 대기 중"}{draft.status === "saving" && "저장 중…"}{draft.status === "saved" && "저장됨"}
          {draft.status === "error" && <><span className="text-fail">{draft.error}</span><button type="button" onClick={() => void flush()} className="mt-1 block min-h-11 text-sm font-semibold text-brand">저장 재시도</button></>}
        </div>
        <div role="group" aria-label="지원자 심사 판정" className="grid grid-cols-3 gap-2">{([['FAIL','불합격','border-fail text-fail'],['ETC','보류','border-border text-muted-strong'],['PASS','합격','border-brand text-brand']] as const).map(([status,label,color]) => <button key={status} type="button" aria-label={label} aria-pressed={applicant.review.status === status} disabled={disabled || reviewLocked} onClick={() => void save(status)} className={`min-h-12 rounded-control border bg-card px-2 py-3 text-sm font-bold hover:bg-surface aria-pressed:bg-surface aria-pressed:ring-2 aria-pressed:ring-current disabled:opacity-50 ${color}`}>{label}</button>)}</div>
      </aside>
    </div>
  </section>;
}

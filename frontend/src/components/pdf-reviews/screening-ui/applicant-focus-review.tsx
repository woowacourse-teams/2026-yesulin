"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { startReviewTimer } from "@/features/analytics/review-timer";
import type { ReviewInput } from "@/features/analytics/review-actions";
import type { Applicant, ReviewStatus } from "@/features/pdf-reviews/screening-types";
import { SecondaryButton } from "@/components/ui/controls";
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
  const { board, requestNavigation, onNoteDirty, onApplicantOpened, onBasicAction, saving, reviewLocked, reviewFocused, patchReview, renderDocument, roleOptions, currentRole, changeRole } = useBoard();
  const [note, setNote] = useState(applicant.review.note);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); onApplicantOpened?.(); }, [applicant.id, onApplicantOpened]);
  useEffect(() => startReviewTimer({ metric_version: 2, workflow: "producer_pdf", review_id: String(board.role.id), item_id: String(applicant.id) }), [board.role.id, applicant.id]);
  useEffect(() => { onNoteDirty?.(note !== applicant.review.note); return () => onNoteDirty?.(false); }, [note, applicant.review.note, onNoteDirty]);
  const move = useCallback((target: Applicant | undefined, input: ReviewInput = "button") => {
    if (!target || saving) return;
    onBasicAction?.(target.id, rows.indexOf(target) < index ? "previous" : "next", input);
    const action = () => onMove(target.id);
    if (requestNavigation) requestNavigation(action); else action();
  }, [saving, onBasicAction, rows, index, onMove, requestNavigation]);
  const save = useCallback(async (status: ReviewStatus, input: ReviewInput = "button") => {
    if (saving || reviewLocked) return;
    onBasicAction?.(applicant.id, "decision_save", input);
    const updated = await reviewFocused(applicant.id, status, undefined, note);
    if (!updated) return;
    if (!updated.applicants.some(row => row.id === applicant.id) && updated.applicants.length) {
      onMove(updated.applicants[Math.min(index, updated.applicants.length - 1)].id);
    }
  }, [saving, reviewLocked, onBasicAction, applicant.id, reviewFocused, note, index, onMove]);
  useEffect(() => {
    const keyboard = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || event.repeat || event.isComposing) return;
      if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
      if (event.target instanceof HTMLElement && event.target.closest('input,textarea,select,button,a,[role="combobox"],[contenteditable=true]')) return;
      const key = event.key.toLowerCase();
      if (["a", "s", "d"].includes(key) && !saving && !reviewLocked) { event.preventDefault(); void save(key === "a" ? "PASS" : key === "s" ? "ETC" : "FAIL", "shortcut"); }
      else if (key === "n" && rows[index + 1]) { event.preventDefault(); move(rows[index + 1], "shortcut"); }
    };
    window.addEventListener("keydown", keyboard); return () => window.removeEventListener("keydown", keyboard);
  }, [saving, reviewLocked, save, rows, index, move]);
  return <section aria-label={`${applicant.name} · 지원자 ${index + 1} / ${rows.length} 심사`} className="pb-8">
    <header className="mb-3 flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0"><h2 ref={heading} tabIndex={-1} className="break-all text-lg font-bold outline-none">{applicant.sourceDocument?.filename || applicant.name}</h2><p className="mt-1 text-sm text-muted-strong">지원자 {index + 1} / {rows.length}</p></div>
      <div className="flex gap-2">{onBack && <SecondaryButton disabled={saving} onClick={onBack}>← 목록</SecondaryButton>}<SecondaryButton aria-label="이전 지원자" disabled={!rows[index - 1] || saving} onClick={() => move(rows[index - 1])}>이전 지원자</SecondaryButton><SecondaryButton aria-label="다음 지원자" disabled={!rows[index + 1] || saving} onClick={() => move(rows[index + 1])}>다음 지원자</SecondaryButton></div>
    </header>
    <div className="grid min-w-0 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_280px]">
      <div className="min-w-0 overflow-hidden rounded-card border border-border bg-card">{renderDocument?.(applicant)}</div>
      <aside className="min-w-0 space-y-5 rounded-card border border-border bg-card p-4 xl:sticky xl:top-4" aria-label="지원자 심사">
        {!!roleOptions?.length && changeRole && <ReviewRoleSelect roles={roleOptions} value={currentRole?.(applicant.id) ?? null} disabled={saving} onChange={roleId => { const action = () => changeRole(applicant.id, roleId); if (requestNavigation) requestNavigation(action); else action(); }} />}
        <div><label htmlFor="pdf-review-memo" className="mb-2 block text-sm font-semibold">내부 메모</label><textarea id="pdf-review-memo" value={note} maxLength={2000} disabled={saving} rows={7} onChange={event => setNote(event.target.value)} className="w-full resize-y rounded-control border border-border bg-surface p-3 text-sm" placeholder="원본을 보며 심사 메모를 남겨 주세요." /><p className="mt-1 text-right text-xs text-muted">{note.length} / 2,000</p><SecondaryButton disabled={saving || reviewLocked || note === applicant.review.note} onClick={() => void patchReview(applicant.id, { note })}>메모 저장</SecondaryButton></div>
        <div role="group" aria-label="지원자 심사 판정" className="grid grid-cols-3 gap-2">{([['FAIL','불합격','border-fail text-fail'],['ETC','보류','border-border text-muted-strong'],['PASS','합격','border-brand text-brand']] as const).map(([status,label,color]) => <button key={status} type="button" aria-label={label} aria-pressed={applicant.review.status === status} disabled={saving || reviewLocked} onClick={() => void save(status)} className={`min-h-12 rounded-control border bg-card px-2 py-3 text-sm font-bold hover:bg-surface disabled:opacity-50 ${color} ${applicant.review.status === status ? 'ring-2 ring-current ring-offset-2' : ''}`}>{label}</button>)}</div>
        {applicant.review.status !== "PENDING" && <SecondaryButton disabled={saving || reviewLocked} onClick={() => void save("PENDING")}>대기로 되돌리기</SecondaryButton>}
        <p className="text-xs leading-5 text-muted-strong">판정하면 메모도 함께 저장됩니다.<br />단축키 A 합격 · S 보류 · D 불합격 · N 다음</p>
      </aside>
    </div>
  </section>;
}

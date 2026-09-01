"use client";

import { selectableStatuses, STATUS_LABELS } from "@/features/auditions/labels";
import { openPrintWindow } from "@/features/auditions/print";
import { useBoard } from "./board-context";
import { HorizontalScrollArea } from "./horizontal-scroll-area";
import { useToast } from "./toast";

const POPUP_BLOCKED = "팝업이 차단되어 인쇄 창을 열 수 없습니다. 팝업 허용 후 다시 시도해 주세요.";
const ACTION_CLASS = "min-h-9 whitespace-nowrap rounded-control bg-white/10 px-3 py-1.5 text-dense font-semibold transition-[background-color,opacity,transform] duration-150 hover:bg-white/20 active:scale-[0.97] disabled:pointer-events-none disabled:bg-white/5 disabled:text-white/45";

export function ActionBar() {
  const { board, filters, selected, saving, screeningCompleted, clearSelection, setStatus, openContacts } = useBoard();
  const toast = useToast();
  if (selected.size === 0) return null;
  const picked = board.applicants.filter((applicant) => selected.has(applicant.id));
  const ids = picked.map((applicant) => applicant.id);

  const actions = <>
    {screeningCompleted ? (
      <span className="self-center whitespace-nowrap px-2 text-xs opacity-60">종료된 전형</span>
    ) : (
      <>
        {filters.work === "DONE" ? <button type="button" disabled={saving} onClick={() => { void setStatus(ids, "PENDING"); }} className={ACTION_CLASS}>검토 대기로</button> : null}
        {selectableStatuses().map((status) => <button key={status} type="button" disabled={saving} onClick={() => { void setStatus(ids, status); }} className={ACTION_CLASS}>{STATUS_LABELS[status]}</button>)}
      </>
    )}
    <button type="button" onClick={() => { if (!openPrintWindow(picked, board.performance)) toast(POPUP_BLOCKED, { type: "error" }); }} className={ACTION_CLASS}>인쇄 · PDF</button>
    {filters.work === "DONE" ? <button type="button" onClick={() => openContacts(picked)} className={`${ACTION_CLASS} bg-brand hover:bg-brand-strong`}>연락처 모아보기</button> : null}
  </>;

  return <>
    <div className="glass-surface-dark fixed inset-x-0 bottom-0 z-40 rounded-t-card border-x-0 border-b-0 px-4 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 text-white shadow-[var(--shadow-3)] lg:hidden">
      <div className="flex min-h-9 items-center"><span className="text-sm font-semibold"><span className="num text-brand-line">{selected.size}</span>명 선택</span><button type="button" onClick={clearSelection} className="ml-auto min-h-9 rounded-control px-3 text-sm text-white/70 hover:bg-white/10 hover:text-white">선택 해제</button></div>
      <HorizontalScrollArea className="mt-2" scrollerClassName="pr-8" fadeClassName="from-sidebar via-sidebar/85"><div className="flex min-w-max gap-2">{actions}</div></HorizontalScrollArea>
    </div>

    <div className="glass-surface-dark fixed bottom-[max(20px,env(safe-area-inset-bottom))] left-[calc(50%+var(--sidebar-width)/2)] z-40 hidden max-w-[calc(100vw-300px)] -translate-x-1/2 items-center gap-2 rounded-card border px-3 py-2.5 text-white lg:flex">
      <span className="whitespace-nowrap text-dense font-semibold"><span className="text-brand-line">{selected.size}</span>명 선택</span>
      <span aria-hidden="true" className="h-5 w-px bg-white/20" />
      {actions}
      <button type="button" aria-label="선택 해제" onClick={clearSelection} className="min-h-9 rounded-control px-3 py-1 text-dense text-white/65 hover:bg-white/10 hover:text-white">선택 해제</button>
    </div>
  </>;
}

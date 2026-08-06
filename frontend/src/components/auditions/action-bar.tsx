"use client";

import { selectableStatuses, STATUS_LABELS } from "@/features/auditions/labels";
import { openPrintWindow } from "@/features/auditions/print";
import { useBoard } from "./board-context";
import { useToast } from "./toast";

const POPUP_BLOCKED = "팝업이 차단되어 인쇄 창을 열 수 없습니다. 팝업 허용 후 다시 시도해 주세요.";

export function ActionBar() {
  const {
    board,
    filters,
    selected,
    saving,
    roundClosed,
    clearSelection,
    setStatus,
    openContacts,
  } = useBoard();
  const toast = useToast();

  if (selected.size === 0) return null;

  const picked = board.applicants.filter((applicant) => selected.has(applicant.id));

  return (
    <div className="glass-surface-dark fixed bottom-[max(20px,env(safe-area-inset-bottom))] left-1/2 z-40 flex max-w-[calc(100vw-32px)] -translate-x-1/2 flex-wrap items-center gap-2 rounded-card border px-3 py-2.5 text-white lg:left-[calc(50%+var(--sidebar-width)/2)] lg:max-w-[calc(100vw-300px)]">
      <span className="whitespace-nowrap text-[13px] font-semibold">
        <span className="text-brand-line">{selected.size}</span>명 선택
      </span>

      <Separator />
      {roundClosed ? (
        <span className="text-[12.5px] opacity-60">마감된 차수</span>
      ) : (
        selectableStatuses(board.round).map((status) => (
          <button
            key={status}
            type="button"
            disabled={saving}
            onClick={() => {
              void setStatus(
                picked.map((applicant) => applicant.id),
                status,
              );
            }}
            className="min-h-9 whitespace-nowrap rounded-control bg-white/10 px-3 py-1.5 text-[13px] font-semibold transition-[background-color,opacity,transform] duration-150 hover:bg-white/20 active:scale-[0.97] disabled:pointer-events-none disabled:bg-white/5 disabled:text-white/45"
          >
            {STATUS_LABELS[status]}
          </button>
        ))
      )}

      <Separator />
      <button
        type="button"
        onClick={() => {
          if (!openPrintWindow(picked, board.performance)) toast(POPUP_BLOCKED, { type: "error" });
        }}
        className="min-h-9 whitespace-nowrap rounded-control bg-white/10 px-3 py-1.5 text-[13px] font-semibold transition-[background-color,transform] duration-150 hover:bg-white/20 active:scale-[0.97]"
      >
        인쇄 · PDF
      </button>

      {filters.work === "DONE" ? (
        <>
          <Separator />
          <button
            type="button"
            onClick={() => openContacts(picked)}
            className="min-h-9 whitespace-nowrap rounded-control bg-brand px-3 py-1.5 text-[13px] font-semibold transition-[background-color,transform] duration-150 hover:bg-brand-strong active:scale-[0.97] active:bg-brand-pressed"
          >
            연락처 모아보기
          </button>
        </>
      ) : null}

      <button
        type="button"
        aria-label="선택 해제"
        onClick={clearSelection}
        className="min-h-9 rounded-control px-3 py-1 text-[13px] text-white/65 transition-[background-color,color,transform] duration-150 hover:bg-white/10 hover:text-white active:scale-[0.97]"
      >
        선택 해제
      </button>
    </div>
  );
}

function Separator() {
  return <span aria-hidden="true" className="h-5 w-px bg-white/20" />;
}

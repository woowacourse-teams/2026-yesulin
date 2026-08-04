"use client";

import { selectableStatuses, STATUS_LABELS } from "@/features/screening/labels";
import { openPrintWindow } from "@/features/screening/print";
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
    <div className="fixed bottom-5 left-1/2 z-40 flex max-w-[calc(100vw-32px)] -translate-x-1/2 flex-wrap items-center gap-[9px] rounded-[10px] bg-foreground py-[9px] pl-[18px] pr-2.5 text-white shadow-[0_8px_28px_rgba(0,0,0,0.22)] lg:left-[calc(50%+var(--sidebar-width)/2)] lg:max-w-[calc(100vw-280px)]">
      <span className="whitespace-nowrap text-[13px] font-semibold">
        <span className="text-[#FF9FBB]">{selected.size}</span>명 선택
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
            className="whitespace-nowrap rounded-[5px] bg-white/12 px-[11px] py-1.5 text-[12.5px] hover:bg-white/25 disabled:opacity-50"
          >
            {STATUS_LABELS[status]}
          </button>
        ))
      )}

      <Separator />
      <button
        type="button"
        onClick={() => {
          if (!openPrintWindow(picked, board.performance)) toast(POPUP_BLOCKED);
        }}
        className="whitespace-nowrap rounded-[5px] bg-white/12 px-[11px] py-1.5 text-[12.5px] hover:bg-white/25"
      >
        인쇄 · PDF
      </button>

      {filters.work === "DONE" ? (
        <>
          <Separator />
          <button
            type="button"
            onClick={() => openContacts(picked)}
            className="whitespace-nowrap rounded-[5px] bg-brand px-[11px] py-1.5 text-[12.5px] hover:bg-brand-strong"
          >
            연락처 모아보기
          </button>
        </>
      ) : null}

      <button
        type="button"
        aria-label="선택 해제"
        onClick={clearSelection}
        className="px-2 py-1 text-[12px] text-white/55 hover:text-white"
      >
        선택 해제
      </button>
    </div>
  );
}

function Separator() {
  return <span aria-hidden="true" className="h-5 w-px bg-white/20" />;
}

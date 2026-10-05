"use client";

import { SecondaryButton } from "@/components/ui/controls";
import type { BoardDraft } from "@/features/timetables/board-draft";
import { formatShortDate, slotFromKey } from "@/features/timetables/time";
import type { TimetableActor, TimetableBoard } from "@/features/timetables/types";
import { barTone, type ChipState } from "./actor-chip";
import { SheetDialog } from "./sheet-dialog";

/** 빈 칸을 눌렀을 때 넣을 배우를 고른다. 미배정 배우가 먼저, 다른 시간의 배우를 옮겨 올 수도 있다. */
export function AssignDialog({ slotLabel, board, draft, chipState, onPick, onClose }: {
  readonly slotLabel: string;
  readonly board: TimetableBoard;
  readonly draft: BoardDraft;
  readonly chipState: (actor: TimetableActor) => ChipState;
  readonly onPick: (actorId: number) => void;
  readonly onClose: () => void;
}) {
  const unassigned = board.actors.filter((actor) => !draft.slots[actor.id]);
  const assigned = board.actors.filter((actor) => draft.slots[actor.id]);
  const row = (actor: TimetableActor) => {
    const state = chipState(actor);
    const key = draft.slots[actor.id];
    const slot = key ? slotFromKey(key) : null;
    return (
      <li key={actor.id}>
        <button
          type="button"
          onClick={() => onPick(actor.id)}
          className="flex min-h-12 w-full items-center gap-2.5 rounded-control px-2 text-left hover:bg-surface"
        >
          <span aria-hidden="true" className={`h-7 w-1 shrink-0 rounded-full ${barTone(state)}`} />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold">{actor.name}</span>
          {state.additional ? <span className="shrink-0 rounded bg-etc px-1 text-[10px] font-bold leading-4 text-white">추가</span> : null}
          {slot ? <span className="num shrink-0 text-xs text-muted">{formatShortDate(slot.date)} {slot.startTime}</span> : null}
        </button>
      </li>
    );
  };

  return (
    <SheetDialog
      title={`${slotLabel}에 넣을 배우`}
      onClose={onClose}
      footer={<SecondaryButton data-autofocus="true" onClick={onClose}>닫기</SecondaryButton>}
    >
      <h3 className="text-xs font-bold text-muted-strong">미배정 <span className="num">{unassigned.length}</span></h3>
      {unassigned.length > 0 ? <ul className="mt-1">{unassigned.map(row)}</ul> : <p className="mt-2 text-sm text-muted">미배정 배우가 없어요.</p>}
      {assigned.length > 0 ? (
        <>
          <h3 className="mt-5 text-xs font-bold text-muted-strong">다른 시간에서 옮기기</h3>
          <ul className="mt-1">{assigned.map(row)}</ul>
        </>
      ) : null}
    </SheetDialog>
  );
}

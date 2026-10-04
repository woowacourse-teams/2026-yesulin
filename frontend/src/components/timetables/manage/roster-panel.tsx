"use client";

import { useState } from "react";
import { FilterChip } from "@/components/ui/controls";
import type { BoardDraft } from "@/features/timetables/board-draft";
import { formatShortDate, slotFromKey } from "@/features/timetables/time";
import type { TimetableActor, TimetableBoard } from "@/features/timetables/types";
import { barTone, type ChipState } from "./actor-chip";

type Filter = "all" | "unassigned" | "additional";

/**
 * 합격자 명단. 이름을 누르면 시간표의 이름표와 같은 할 일을 고른다. 최초·추가 합격은 시간표와 같은 색으로 구분하고,
 * 미배정이 있으면 한 번에 자동 배정한다. 이름표를 끌어 여기에 놓으면 미배정이 된다.
 */
export function RosterPanel({ board, draft, chipState, busy, onAdd, onAutoAssign, onActorClick, onUnassign }: {
  readonly board: TimetableBoard;
  readonly draft: BoardDraft;
  readonly chipState: (actor: TimetableActor) => ChipState;
  readonly busy: boolean;
  readonly onAdd: () => void;
  readonly onAutoAssign: () => void;
  readonly onActorClick: (actorId: number) => void;
  readonly onUnassign: (actorId: number) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [dropActive, setDropActive] = useState(false);
  const unassigned = board.actors.filter((actor) => !draft.slots[actor.id]);
  const additional = board.actors.filter((actor) => chipState(actor).additional);
  const visible = filter === "unassigned" ? unassigned : filter === "additional" ? additional : board.actors;

  return (
    <section
      aria-labelledby="roster-heading"
      onDragOver={(event) => {
        if (!event.dataTransfer.types.includes("text/plain")) return;
        event.preventDefault();
        setDropActive(true);
      }}
      onDragLeave={() => setDropActive(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDropActive(false);
        const actorId = Number(event.dataTransfer.getData("text/plain"));
        if (Number.isInteger(actorId) && board.actors.some((actor) => actor.id === actorId)) onUnassign(actorId);
      }}
      className={`flex max-h-[60dvh] flex-col rounded-card border bg-card lg:max-h-[calc(100dvh-180px)] ${dropActive ? "border-brand bg-brand-soft" : "border-border"}`}
    >
      <div className="flex items-center justify-between gap-2 px-4 pt-4">
        <h2 id="roster-heading" className="text-base font-bold">
          합격자 <span className="num text-muted">{board.actors.length}</span>
        </h2>
        <button
          type="button"
          onClick={onAdd}
          disabled={busy}
          className="inline-flex h-9 items-center rounded-control bg-foreground px-3 text-sm font-semibold text-white hover:bg-sidebar-hover disabled:bg-border"
        >
          + 추가
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5 px-4 pt-3" role="group" aria-label="명단 보기">
        <FilterChip pressed={filter === "all"} onClick={() => setFilter("all")}>전체</FilterChip>
        <FilterChip pressed={filter === "unassigned"} onClick={() => setFilter("unassigned")}>
          미배정 <span className="num">{unassigned.length}</span>
        </FilterChip>
        {additional.length > 0 ? (
          <FilterChip pressed={filter === "additional"} onClick={() => setFilter("additional")}>
            추가 합격 <span className="num">{additional.length}</span>
          </FilterChip>
        ) : null}
      </div>
      {unassigned.length > 0 ? (
        <div className="px-4 pt-3">
          <button
            type="button"
            onClick={onAutoAssign}
            disabled={busy}
            className="flex min-h-11 w-full items-center justify-center gap-1 rounded-control border border-brand-line bg-brand-soft text-sm font-semibold text-brand hover:bg-brand-soft-strong disabled:opacity-50"
          >
            미배정 <span className="num">{unassigned.length}</span>명 빈 칸에 자동 배정
          </button>
        </div>
      ) : null}
      <ul className="mt-3 min-h-0 flex-1 divide-y divide-border-soft overflow-y-auto border-t border-border">
        {visible.length === 0 ? <li className="px-4 py-6 text-center text-sm text-muted">해당하는 배우가 없어요.</li> : null}
        {visible.map((actor) => {
          const state = chipState(actor);
          const key = draft.slots[actor.id];
          const slot = key ? slotFromKey(key) : null;
          return (
            <li key={actor.id}>
              <button
                type="button"
                onClick={() => onActorClick(actor.id)}
                className="flex min-h-12 w-full items-center gap-2.5 px-4 py-2 text-left hover:bg-surface focus-visible:bg-surface focus-visible:outline-none"
              >
                <span aria-hidden="true" className={`h-8 w-1 shrink-0 rounded-full ${barTone(state)}`} />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
                    <span className="truncate">{actor.name}</span>
                    {state.additional ? <span className="shrink-0 rounded bg-etc px-1 text-[10px] font-bold leading-4 text-white">추가</span> : null}
                    {state.changedByActor ? <span className="shrink-0 text-xs text-etc" title="배우가 직접 바꿈">↻</span> : null}
                  </span>
                  <span className="num block text-xs text-muted">{actor.phone}</span>
                </span>
                <span className={`num shrink-0 text-right text-xs font-semibold ${slot ? "text-muted-strong" : "text-warn"}`}>
                  {slot ? <>{formatShortDate(slot.date)}<br />{slot.startTime}</> : "미배정"}
                  {state.unsaved ? <span className="block font-normal text-warn">저장 전</span> : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

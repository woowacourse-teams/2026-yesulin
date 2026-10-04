"use client";

import { useState } from "react";
import { occupancy, type BoardDraft } from "@/features/timetables/board-draft";
import { formatShortDate, minutesOf, slotEndTime, slotKey, slotsOf } from "@/features/timetables/time";
import type { TimeSlot, TimetableActor, TimetableBoard } from "@/features/timetables/types";
import { ActorChip, type ChipState } from "./actor-chip";

type Row =
  | { readonly kind: "slot"; readonly slot: TimeSlot; readonly key: string }
  | { readonly kind: "break"; readonly from: string; readonly to: string };

/** 날짜별 시간 칸 줄. 시간대 사이가 비면 쉬는 시간 줄을 끼운다. */
function rowsOf(slots: readonly TimeSlot[], slotMinutes: number): Row[] {
  const rows: Row[] = [];
  slots.forEach((slot, index) => {
    const previous = slots[index - 1];
    if (previous && minutesOf(slot.startTime) !== minutesOf(previous.startTime) + slotMinutes) {
      rows.push({ kind: "break", from: slotEndTime(previous, slotMinutes), to: slot.startTime });
    }
    rows.push({ kind: "slot", slot, key: slotKey(slot) });
  });
  return rows;
}

/**
 * 오디션 타임테이블. 날짜마다 한 열, 시간 칸마다 한 줄로 이름을 채워 보여 준다(엑셀 오디션 시간표와 같은 모양).
 * 빈 칸을 누르면 배우를 고르고, 이름을 누르면 옮기기·빼기를 고른다. 옮기는 중에는 놓을 수 있는 칸이 강조된다.
 */
export function ScheduleSheet({
  board,
  draft,
  chipState,
  movingActorId,
  disabled,
  onEmptySlot,
  onActorClick,
  onPlace,
}: {
  readonly board: TimetableBoard;
  readonly draft: BoardDraft;
  readonly chipState: (actor: TimetableActor) => ChipState;
  readonly movingActorId: number | null;
  readonly disabled: boolean;
  readonly onEmptySlot: (key: string) => void;
  readonly onActorClick: (actorId: number) => void;
  readonly onPlace: (actorId: number, key: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [dropKey, setDropKey] = useState<string | null>(null);
  const { setting } = draft;
  const slots = slotsOf(setting);
  const dates = [...new Set(slots.map((slot) => slot.date))];
  const occupants = occupancy(board, draft);
  const actorsById = new Map(board.actors.map((actor) => [actor.id, actor]));
  const moving = movingActorId !== null;

  const drop = (event: React.DragEvent, key: string) => {
    event.preventDefault();
    setDropKey(null);
    setDragging(false);
    const actorId = Number(event.dataTransfer.getData("text/plain"));
    if (Number.isInteger(actorId) && actorsById.has(actorId)) onPlace(actorId, key);
  };

  return (
    <div className="flex snap-x gap-3 overflow-x-auto pb-2" role="region" aria-label="오디션 타임테이블">
      {dates.map((date) => {
        const daySlots = slots.filter((slot) => slot.date === date);
        const filled = daySlots.reduce((sum, slot) => sum + (occupants.get(slotKey(slot))?.length ?? 0), 0);
        return (
          <section
            key={date}
            aria-label={formatShortDate(date)}
            className="min-w-[15.5rem] max-w-[24rem] flex-1 shrink-0 snap-start rounded-card border border-border bg-card"
          >
            <header className="flex items-baseline justify-between border-b border-border px-3 py-2.5">
              <h3 className="text-sm font-bold text-foreground">{formatShortDate(date)}</h3>
              <span className="num text-xs text-muted">{filled}/{daySlots.length * setting.slotCapacity}</span>
            </header>
            <ol className="px-2 py-1.5">
              {rowsOf(daySlots, setting.slotMinutes).map((row) => {
                if (row.kind === "break") {
                  return (
                    <li key={`break-${row.from}`} className="my-1 flex items-center gap-2 px-1 text-[11px] text-muted" aria-label={`${row.from}~${row.to} 쉬는 시간`}>
                      <span className="h-px flex-1 bg-border" />
                      <span className="num">{row.from}~{row.to} 쉬는 시간</span>
                      <span className="h-px flex-1 bg-border" />
                    </li>
                  );
                }
                const ids = occupants.get(row.key) ?? [];
                const remaining = setting.slotCapacity - ids.length;
                const swappable = setting.slotCapacity === 1 && ids.length === 1;
                return (
                  <li
                    key={row.key}
                    onDragOver={(event) => {
                      if (!dragging || disabled) return;
                      event.preventDefault();
                      setDropKey(row.key);
                    }}
                    onDragLeave={() => setDropKey((current) => (current === row.key ? null : current))}
                    onDrop={(event) => drop(event, row.key)}
                    className={`flex items-start gap-2 rounded-md px-1 py-1 ${dropKey === row.key ? "bg-brand-soft" : ""}`}
                  >
                    <span className="num w-10 shrink-0 pt-2 text-xs font-semibold text-muted-strong">{row.slot.startTime}</span>
                    <div className="flex min-w-0 flex-1 flex-wrap gap-1">
                      {ids.map((id) => {
                        const actor = actorsById.get(id);
                        if (!actor) return null;
                        const isMoving = movingActorId === id;
                        return (
                          <ActorChip
                            key={id}
                            actor={actor}
                            state={chipState(actor)}
                            disabled={disabled || (moving && !isMoving && !swappable)}
                            onClick={() => {
                              if (movingActorId === null) onActorClick(id);
                              else if (!isMoving && swappable) onPlace(movingActorId, row.key);
                            }}
                            onDragStart={() => setDragging(true)}
                            onDragEnd={() => { setDragging(false); setDropKey(null); }}
                            className={`flex-1 ${moving && swappable && !isMoving ? "outline outline-1 outline-dashed outline-offset-1 outline-brand" : ""}`}
                          />
                        );
                      })}
                      {remaining > 0 ? (
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => (movingActorId !== null ? onPlace(movingActorId, row.key) : onEmptySlot(row.key))}
                          aria-label={`${formatShortDate(date)} ${row.slot.startTime} ${moving ? "여기로 옮기기" : "빈 칸에 배우 배정"}${remaining > 1 ? ` (${remaining}자리)` : ""}`}
                          className={`inline-flex h-8 min-w-[4.5rem] flex-1 items-center justify-center rounded-md border border-dashed text-xs font-semibold transition-colors ${
                            moving
                              ? "border-brand bg-brand-soft text-brand hover:bg-brand-soft-strong"
                              : "border-muted-soft/60 text-muted hover:border-brand-line hover:bg-brand-soft hover:text-brand"
                          }`}
                        >
                          {moving ? "여기로" : remaining > 1 ? `+ 배정 (${remaining}자리)` : "+ 배정"}
                        </button>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        );
      })}
    </div>
  );
}

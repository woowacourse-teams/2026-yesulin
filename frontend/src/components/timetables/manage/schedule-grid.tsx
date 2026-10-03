"use client";

import { useState } from "react";
import { occupancy, type BoardDraft } from "@/features/timetables/board-draft";
import { formatShortDate, formatSlot, hmOf, minutesOf, slotKey, slotsOf } from "@/features/timetables/time";
import type { TimetableActor, TimetableBoard } from "@/features/timetables/types";
import { ActorChip } from "./actor-chip";

const TIME_COLUMN_WIDTH = 56;
const MIN_BLOCK_HEIGHT = 52;
const MAX_BLOCK_HEIGHT = 160;

/** 칸 하나에 정원만큼 이름표가 두 줄씩 들어가도록 분당 높이를 정한다. */
function pixelsPerMinute(slotMinutes: number, capacity: number): number {
  const rows = Math.ceil(Math.min(capacity, 10) / 2);
  const target = Math.min(MAX_BLOCK_HEIGHT, Math.max(MIN_BLOCK_HEIGHT, 30 + rows * 26));
  return target / slotMinutes;
}

/**
 * 구글 캘린더처럼 날짜를 열, 시간을 세로축으로 놓은 보드. 바운더리(시간대)는 배경으로, 시간 칸은 그 위의 블록으로 그린다.
 * 마우스는 이름표를 끌어다 놓고, 터치·키보드는 이름표를 눌러 고른 뒤 옮길 칸을 누른다.
 */
export function ScheduleGrid({ board, draft, selectedActorId, problemActorIds, onSelect, onPlace, disabled }: {
  readonly board: TimetableBoard;
  readonly draft: BoardDraft;
  readonly selectedActorId: number | null;
  readonly problemActorIds: ReadonlySet<number>;
  readonly onSelect: (actorId: number | null) => void;
  readonly onPlace: (actorId: number, key: string | null) => void;
  readonly disabled: boolean;
}) {
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropKey, setDropKey] = useState<string | null>(null);
  const { setting } = draft;
  const dates = [...new Set(setting.windows.map((window) => window.date))].sort();
  if (dates.length === 0) {
    return <p className="rounded-card border border-border bg-card px-5 py-14 text-center text-muted">시간대를 먼저 정해 주세요.</p>;
  }

  const slots = slotsOf(setting);
  const occupants = occupancy(board, draft);
  const actorsById = new Map(board.actors.map((actor) => [actor.id, actor]));
  const serverKeys = new Map(board.actors.map((actor) => [actor.id, actor.slot ? slotKey(actor.slot) : null]));
  const startMinute = Math.floor(Math.min(...setting.windows.map((window) => minutesOf(window.startTime))) / 60) * 60;
  const endMinute = Math.ceil(Math.max(...setting.windows.map((window) => minutesOf(window.endTime))) / 60) * 60;
  const ppm = pixelsPerMinute(setting.slotMinutes, setting.slotCapacity);
  const height = (endMinute - startMinute) * ppm;
  const hours = Array.from({ length: (endMinute - startMinute) / 60 + 1 }, (_, index) => startMinute + index * 60);
  const placingId = draggingId ?? selectedActorId;
  const placing = placingId === null ? null : actorsById.get(placingId) ?? null;

  const drop = (event: React.DragEvent, key: string) => {
    event.preventDefault();
    const actorId = Number(event.dataTransfer.getData("text/plain"));
    setDropKey(null);
    setDraggingId(null);
    if (Number.isInteger(actorId) && actorsById.has(actorId)) onPlace(actorId, key);
  };

  return (
    <div
      role="region"
      aria-label="오디션 시간표"
      tabIndex={0}
      className="max-h-[calc(100dvh-200px)] min-h-[320px] overflow-auto rounded-card border border-border bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
    >
      <div
        className="grid min-w-max"
        style={{ gridTemplateColumns: `${TIME_COLUMN_WIDTH}px repeat(${dates.length}, minmax(156px, 1fr))` }}
      >
        <div className="sticky left-0 top-0 z-30 border-b border-r border-border bg-card" />
        {dates.map((date) => {
          const daySlots = slots.filter((slot) => slot.date === date);
          const filled = daySlots.reduce((sum, slot) => sum + (occupants.get(slotKey(slot))?.length ?? 0), 0);
          return (
            <div key={date} className="sticky top-0 z-20 border-b border-r border-border bg-card px-3 py-2 last:border-r-0">
              <p className="text-sm font-bold text-foreground">{formatShortDate(date)}</p>
              <p className="num text-xs text-muted">{filled} / {daySlots.length * setting.slotCapacity}명</p>
            </div>
          );
        })}

        <div className="sticky left-0 z-10 border-r border-border bg-card" style={{ height }}>
          {hours.map((minute) => (
            <span
              key={minute}
              className="num absolute right-2 -translate-y-1/2 text-[11px] text-muted first:translate-y-0"
              style={{ top: (minute - startMinute) * ppm }}
            >
              {hmOf(minute)}
            </span>
          ))}
        </div>

        {dates.map((date) => (
          <div key={date} className="relative border-r border-border last:border-r-0" style={{ height }}>
            {hours.map((minute) => (
              <span
                key={minute}
                aria-hidden="true"
                className="absolute inset-x-0 border-t border-border-soft"
                style={{ top: (minute - startMinute) * ppm }}
              />
            ))}
            {setting.windows.filter((window) => window.date === date).map((window) => (
              <span
                key={`${window.startTime}-${window.endTime}`}
                aria-hidden="true"
                className="absolute inset-x-0 bg-brand-soft/60"
                style={{
                  top: (minutesOf(window.startTime) - startMinute) * ppm,
                  height: (minutesOf(window.endTime) - minutesOf(window.startTime)) * ppm,
                }}
              />
            ))}
            {slots.filter((slot) => slot.date === date).map((slot) => {
              const key = slotKey(slot);
              const ids = occupants.get(key) ?? [];
              const full = ids.length >= setting.slotCapacity;
              const canPlace = placing !== null && !ids.includes(placing.id);
              const swapTarget = full && setting.slotCapacity === 1;
              const label = `${formatSlot(slot)} 칸 ${ids.length}/${setting.slotCapacity}명`;
              return (
                <div
                  key={key}
                  data-slot={key}
                  onDragOver={(event) => {
                    if (draggingId === null || disabled) return;
                    event.preventDefault();
                    event.dataTransfer.dropEffect = "move";
                    setDropKey(key);
                  }}
                  onDragLeave={() => setDropKey((current) => (current === key ? null : current))}
                  onDrop={(event) => drop(event, key)}
                  className={`absolute inset-x-1 overflow-hidden rounded-md border px-1.5 py-1 transition-colors ${
                    dropKey === key
                      ? "border-brand bg-brand-soft-strong"
                      : full ? "border-border bg-card" : "border-dashed border-brand-line bg-card/80"
                  }`}
                  style={{ top: (minutesOf(slot.startTime) - startMinute) * ppm + 1, height: setting.slotMinutes * ppm - 2 }}
                >
                  {canPlace && !disabled ? (
                    <button
                      type="button"
                      onClick={() => onPlace(placing.id, key)}
                      aria-label={`${placing.name} 배우를 ${label}으로 ${swapTarget ? "옮기고 자리 바꾸기" : "옮기기"}`}
                      className="absolute inset-0 z-0 rounded-md hover:bg-brand-soft focus-visible:bg-brand-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
                    />
                  ) : null}
                  <div className="pointer-events-none relative z-10 flex items-center justify-between gap-1 text-[11px] leading-4">
                    <span className="num text-muted">{slot.startTime}</span>
                    <span className={`num ${full ? "font-semibold text-muted-strong" : "text-muted"}`}>
                      {ids.length}/{setting.slotCapacity}
                    </span>
                  </div>
                  <div className="pointer-events-none relative z-10 mt-0.5 flex flex-wrap gap-1">
                    {ids.map((id) => {
                      const actor = actorsById.get(id) as TimetableActor;
                      return (
                        <ActorChip
                          key={id}
                          actor={actor}
                          selected={selectedActorId === id}
                          moved={serverKeys.get(id) !== key}
                          problem={problemActorIds.has(id)}
                          disabled={disabled}
                          onSelect={onSelect}
                          onDragStart={setDraggingId}
                          onDragEnd={() => { setDraggingId(null); setDropKey(null); }}
                          className="pointer-events-auto max-w-full"
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

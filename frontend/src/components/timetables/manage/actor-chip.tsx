"use client";

import type { TimetableActor } from "@/features/timetables/types";

/**
 * 보드의 배우 이름표. 끌어다 놓거나 눌러서 고른다. 상태는 색과 함께 기호·숨김 문구로도 알린다.
 * - 점선: 저장하지 않은 이동, 빨강: 저장할 수 없는 배정, 보라 ↻: 배우가 링크에서 직접 바꾼 시간
 */
export function ActorChip({ actor, selected, moved, problem, disabled, onSelect, onDragStart, onDragEnd, className = "" }: {
  readonly actor: TimetableActor;
  readonly selected: boolean;
  readonly moved: boolean;
  readonly problem: boolean;
  readonly disabled: boolean;
  readonly onSelect: (actorId: number | null) => void;
  readonly onDragStart: (actorId: number) => void;
  readonly onDragEnd: () => void;
  readonly className?: string;
}) {
  const changedByActor = actor.actorChangedAt !== null && !moved;
  const tone = problem
    ? "border-fail bg-fail-bg text-fail"
    : moved
      ? "border-dashed border-warn bg-warn-bg text-warn"
      : changedByActor ? "border-etc/40 bg-etc-bg text-etc" : "border-brand-line bg-brand-soft text-brand";
  const states = [
    moved ? "저장 전 이동" : null,
    problem ? "저장 불가" : null,
    changedByActor ? "배우가 직접 바꿈" : null,
  ].filter(Boolean).join(", ");

  return (
    <button
      type="button"
      draggable={!disabled}
      disabled={disabled}
      aria-pressed={selected}
      title={`${actor.name} · ${actor.phone}`}
      onClick={() => onSelect(selected ? null : actor.id)}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", String(actor.id));
        event.dataTransfer.effectAllowed = "move";
        onDragStart(actor.id);
      }}
      onDragEnd={onDragEnd}
      className={`inline-flex min-h-6 cursor-grab items-center gap-0.5 truncate rounded-md border px-1.5 text-xs font-semibold active:cursor-grabbing disabled:cursor-default ${tone} ${
        selected ? "ring-2 ring-foreground ring-offset-1" : ""
      } ${className}`}
    >
      <span className="truncate">{actor.name}</span>
      {changedByActor ? <span aria-hidden="true">↻</span> : null}
      {states ? <span className="sr-only">({states})</span> : null}
    </button>
  );
}

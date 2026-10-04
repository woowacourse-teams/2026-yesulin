"use client";

import type { TimetableActor } from "@/features/timetables/types";

export type ChipState = {
  readonly additional: boolean;
  /** 불러온 뒤 옮겨 아직 저장하지 않았다. */
  readonly unsaved: boolean;
  readonly problem: boolean;
  /** 배우가 링크에서 직접 바꾼 시간이다. */
  readonly changedByActor: boolean;
  /** 지금 옮기는 중인 배우다. */
  readonly moving: boolean;
};

/** 최초 합격은 파랑, 추가 합격은 보라. 색과 함께 "추가" 글자·아이콘으로도 구분한다. */
export function chipTone(state: Pick<ChipState, "additional" | "problem">): string {
  if (state.problem) return "border-fail bg-fail-bg text-fail";
  return state.additional
    ? "border-etc/30 border-l-etc bg-etc-bg text-etc"
    : "border-brand-line border-l-brand bg-brand-soft text-upcoming";
}

/** 명단·선택 창의 색 막대. 이름표보다 진하게 칠해 한눈에 구분되게 한다. */
export function barTone(state: Pick<ChipState, "additional" | "problem">): string {
  if (state.problem) return "bg-fail";
  return state.additional ? "bg-etc" : "bg-brand";
}

/**
 * 시간표와 명단에 쓰는 배우 이름표. 누르면 할 일을 고르고, 데스크톱에서는 끌어다 다른 칸에 놓을 수 있다.
 */
export function ActorChip({ actor, state, disabled, onClick, onDragStart, onDragEnd, className = "" }: {
  readonly actor: TimetableActor;
  readonly state: ChipState;
  readonly disabled: boolean;
  readonly onClick: () => void;
  readonly onDragStart?: (actorId: number) => void;
  readonly onDragEnd?: () => void;
  readonly className?: string;
}) {
  const labels = [
    state.additional ? "추가 합격" : "최초 합격",
    state.unsaved ? "저장 전" : null,
    state.changedByActor ? "배우가 직접 바꿈" : null,
    state.problem ? "저장할 수 없음" : null,
  ].filter(Boolean).join(", ");

  return (
    <button
      type="button"
      draggable={!disabled}
      disabled={disabled}
      onClick={onClick}
      onDragStart={(event) => {
        event.dataTransfer.setData("text/plain", String(actor.id));
        event.dataTransfer.effectAllowed = "move";
        onDragStart?.(actor.id);
      }}
      onDragEnd={onDragEnd}
      aria-label={`${actor.name} (${labels})`}
      className={`relative inline-flex h-8 min-w-0 max-w-full cursor-grab items-center gap-1 rounded-md border border-l-[3px] px-2 text-sm font-semibold active:cursor-grabbing disabled:cursor-default ${chipTone(state)} ${
        state.unsaved ? "border-dashed border-warn" : ""
      } ${state.moving ? "ring-2 ring-foreground ring-offset-1" : ""} ${className}`}
    >
      <span className="truncate">{actor.name}</span>
      {state.additional ? <span aria-hidden="true" className="shrink-0 rounded bg-etc px-1 text-[10px] font-bold leading-4 text-white">추가</span> : null}
      {state.changedByActor ? <span aria-hidden="true" className="shrink-0 text-xs">↻</span> : null}
      {state.unsaved ? <span aria-hidden="true" className="absolute -right-1 -top-1 size-2 rounded-full bg-warn" /> : null}
    </button>
  );
}

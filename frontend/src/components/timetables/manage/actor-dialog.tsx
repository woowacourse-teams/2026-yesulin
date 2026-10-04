"use client";

import { DestructiveButton, PrimaryButton, SecondaryButton, TextButton } from "@/components/ui/controls";
import { formatInstant, formatSlot } from "@/features/timetables/time";
import type { TimeSlot, TimetableActor } from "@/features/timetables/types";
import type { ChipState } from "./actor-chip";
import { SheetDialog } from "./sheet-dialog";

/** 이름을 눌렀을 때 배우 정보와 할 일(시간 옮기기·미배정으로·명단에서 삭제)을 보여 준다. */
export function ActorDialog({ actor, state, slot, canUnassign, onMove, onUnassign, onRemove, onClose }: {
  readonly actor: TimetableActor;
  readonly state: ChipState;
  readonly slot: TimeSlot | null;
  readonly canUnassign: boolean;
  readonly onMove: () => void;
  readonly onUnassign: () => void;
  readonly onRemove: () => void;
  readonly onClose: () => void;
}) {
  const facts: [string, React.ReactNode][] = [
    ["구분", state.additional ? <span className="font-semibold text-etc">추가 합격</span> : <span className="font-semibold text-upcoming">최초 합격</span>],
    ["휴대폰", <span key="phone" className="num">{actor.phone}</span>],
    ["시간", slot ? <span className="num">{formatSlot(slot)}{state.unsaved ? <span className="ml-1 text-warn">(저장 전)</span> : null}</span> : <span className="text-warn">미배정</span>],
    ["안내 문자", actor.invited ? "보냄" : "아직"],
  ];
  if (state.changedByActor && actor.previousSlot && actor.actorChangedAt) {
    facts.push(["배우 변경", <span key="change" className="num">{formatSlot(actor.previousSlot)}에서 바꿈 · {formatInstant(actor.actorChangedAt)}</span>]);
  }

  return (
    <SheetDialog title={actor.name} onClose={onClose}>
      <dl className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
        {facts.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted">{label}</dt>
            <dd className="text-foreground">{value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-5 grid gap-2">
        <PrimaryButton data-autofocus="true" onClick={onMove}>{slot ? "다른 시간으로 옮기기" : "시간 정하기"}</PrimaryButton>
        {slot && canUnassign ? <SecondaryButton onClick={onUnassign}>미배정으로</SecondaryButton> : null}
        <DestructiveButton onClick={onRemove}>명단에서 삭제</DestructiveButton>
        <TextButton onClick={onClose}>닫기</TextButton>
      </div>
    </SheetDialog>
  );
}

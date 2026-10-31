import type { RosterActor, RosterSlot } from "./timetables";

export type SlotDraft = { date: string; time: string; previousSlot: RosterSlot | null };
export type ScheduleState = {
  drafts: Record<number, SlotDraft>; selected: number[]; batchDate: string; batchTime: string;
};
export const emptySchedule = (): ScheduleState => ({ drafts: {}, selected: [], batchDate: "", batchTime: "" });
export const scheduleDirty = (state: ScheduleState) => Object.keys(state.drafts).length > 0 || !!state.batchDate || !!state.batchTime;
export function slotLabel(slot: RosterSlot | null) { return slot ? `${slot.date} ${slot.startTime.slice(0, 5)}` : "미배정"; }
export function slotError(date: string, time: string): string {
  if (!date && !time) return "";
  if (!date || !time) return "날짜와 시간을 모두 입력하거나 둘 다 비워 주세요.";
  const [year, month, day] = date.split("-").map(Number);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || year < 1000 || month < 1 || month > 12 || day < 1 || day > days[month - 1]
    || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return "올바른 날짜와 분 단위 시간을 입력해 주세요.";
  return "";
}
export function draftFor(state: ScheduleState, actor: RosterActor): SlotDraft {
  return state.drafts[actor.id] ?? { date: actor.slot?.date ?? "", time: actor.slot?.startTime.slice(0, 5) ?? "", previousSlot: actor.slot };
}
export function updateSlot(state: ScheduleState, actor: RosterActor, date: string, time: string): ScheduleState {
  const previousSlot = draftFor(state, actor).previousSlot;
  const drafts = { ...state.drafts };
  if (date === (previousSlot?.date ?? "") && time === (previousSlot?.startTime.slice(0, 5) ?? "")) delete drafts[actor.id];
  else drafts[actor.id] = { date, time, previousSlot };
  return { ...state, drafts };
}
export function scheduleAssignments(state: ScheduleState) {
  return Object.entries(state.drafts).map(([id, draft]) => ({ actorId: Number(id), previousSlot: draft.previousSlot,
    slot: draft.date && draft.time ? { date: draft.date, startTime: draft.time } : null }));
}

/** 해당 행의 입력만 취소하고 마지막으로 조회한 저장값을 표시한다. */
export function resetSlot(state: ScheduleState, actorId: number): ScheduleState {
  const drafts = { ...state.drafts };
  delete drafts[actorId];
  return { ...state, drafts };
}

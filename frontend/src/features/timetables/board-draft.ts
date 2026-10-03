import { compareWindows, formatSlot, sameSlot, slotFromKey, slotKey, slotsOf } from "./time";
import type { SlotAssignment, TimeSlot, TimetableActor, TimetableBoard, TimetableSetting } from "./types";

/**
 * 기획사 보드의 저장 전 편집본. 드래그·자동 배정·시간대 변경은 이 편집본만 바꾸고, 저장할 때 서버가 다시 검사한다.
 * `slots`는 배우 ID별 시간 칸 키(`YYYY-MM-DDTHH:mm`)이며 미배정은 null이다.
 */
export type BoardDraft = {
  readonly setting: TimetableSetting;
  readonly slots: Readonly<Record<number, string | null>>;
};

export type DraftProblem = {
  readonly key: string;
  readonly message: string;
  readonly actorIds: readonly number[];
};

export function draftFrom(board: TimetableBoard): BoardDraft {
  return {
    setting: {
      slotMinutes: board.slotMinutes,
      slotCapacity: board.slotCapacity,
      windows: [...board.windows].sort(compareWindows),
    },
    slots: Object.fromEntries(board.actors.map((actor) => [actor.id, actor.slot ? slotKey(actor.slot) : null])),
  };
}

/** 칸마다 배정된 배우 ID를 등록 순서대로 모은다. */
export function occupancy(board: TimetableBoard, draft: BoardDraft): Map<string, number[]> {
  const counts = new Map<string, number[]>();
  for (const actor of board.actors) {
    const key = draft.slots[actor.id];
    if (!key) continue;
    counts.set(key, [...(counts.get(key) ?? []), actor.id]);
  }
  return counts;
}

export function moveActor(draft: BoardDraft, actorId: number, key: string | null): BoardDraft {
  return { ...draft, slots: { ...draft.slots, [actorId]: key } };
}

/**
 * 시간이 비어 있는 배우를 등록 순서대로 가장 이른 빈 칸부터 채운다. 이미 배정된 배우는 옮기지 않는다.
 * 칸이 모자라면 남은 배우는 비워 두고 그 수를 돌려준다.
 */
export function autoAssign(board: TimetableBoard, draft: BoardDraft): { draft: BoardDraft; placed: number; unplaced: number } {
  const offered = slotsOf(draft.setting).map(slotKey);
  const counts = new Map([...occupancy(board, draft)].map(([key, ids]) => [key, ids.length]));
  const slots = { ...draft.slots };
  let placed = 0;
  let unplaced = 0;
  let cursor = 0;
  for (const actor of board.actors) {
    if (slots[actor.id]) continue;
    while (cursor < offered.length && (counts.get(offered[cursor]) ?? 0) >= draft.setting.slotCapacity) cursor += 1;
    if (cursor >= offered.length) {
      unplaced += 1;
      continue;
    }
    const key = offered[cursor];
    slots[actor.id] = key;
    counts.set(key, (counts.get(key) ?? 0) + 1);
    placed += 1;
  }
  return { draft: { ...draft, slots }, placed, unplaced };
}

/**
 * 시간대·소요 시간·정원을 바꾼다. 아직 안내하지 않은 배우 중 새 규칙에 맞지 않는 배우는 미배정으로 돌린다.
 * 안내한 배우는 자동으로 옮기지 않고 저장 전 문제로 보여 줘 기획사가 직접 옮기게 한다.
 */
export function changeSetting(
  board: TimetableBoard,
  draft: BoardDraft,
  setting: TimetableSetting,
): { draft: BoardDraft; released: number } {
  const offered = new Set(slotsOf(setting).map(slotKey));
  const slots = { ...draft.slots };
  const counts = new Map<string, number>();
  let released = 0;
  const ordered = [...board.actors].sort((left, right) => Number(right.invited) - Number(left.invited));
  for (const actor of ordered) {
    const key = slots[actor.id];
    if (!key) continue;
    const count = counts.get(key) ?? 0;
    if (!actor.invited && (!offered.has(key) || count >= setting.slotCapacity)) {
      slots[actor.id] = null;
      released += 1;
      continue;
    }
    counts.set(key, count + 1);
  }
  return { draft: { setting: { ...setting, windows: [...setting.windows].sort(compareWindows) }, slots }, released };
}

/** 저장하면 서버가 거절할 상태를 미리 알려 준다. */
export function problemsOf(board: TimetableBoard, draft: BoardDraft): DraftProblem[] {
  const problems: DraftProblem[] = [];
  const offered = new Set(slotsOf(draft.setting).map(slotKey));
  const names = new Map(board.actors.map((actor) => [actor.id, actor.name]));
  for (const actor of board.actors) {
    const key = draft.slots[actor.id];
    if (key && !offered.has(key)) {
      problems.push({
        key: `outside-${actor.id}`,
        message: `‘${actor.name}’ 배우의 시간(${formatSlot(slotFromKey(key))})이 정한 시간대 밖에 있어요.`,
        actorIds: [actor.id],
      });
    }
    if (!key && board.status === "PUBLISHED" && actor.invited) {
      problems.push({
        key: `unassigned-${actor.id}`,
        message: `안내를 받은 ‘${actor.name}’ 배우의 시간이 비어 있어요. 다른 시간으로 옮기거나 명단에서 빼 주세요.`,
        actorIds: [actor.id],
      });
    }
  }
  for (const [key, ids] of occupancy(board, draft)) {
    if (ids.length > draft.setting.slotCapacity) {
      problems.push({
        key: `capacity-${key}`,
        message: `${formatSlot(slotFromKey(key))} 칸에 정원 ${draft.setting.slotCapacity}명보다 많은 배우(${ids.map((id) => names.get(id)).join(", ")})가 있어요.`,
        actorIds: ids,
      });
    }
  }
  return problems;
}

function serverSlotOf(actor: TimetableActor): TimeSlot | null {
  return actor.slot ? { date: actor.slot.date, startTime: actor.slot.startTime } : null;
}

/** 불러온 뒤 실제로 옮긴 배우만 보낸다. 그사이 배우가 직접 바꾼 시간은 덮어쓰지 않도록 이전 시간을 함께 보낸다. */
export function assignmentsOf(board: TimetableBoard, draft: BoardDraft): SlotAssignment[] {
  return board.actors.flatMap((actor) => {
    const previous = serverSlotOf(actor);
    const key = draft.slots[actor.id] ?? null;
    const next = key ? slotFromKey(key) : null;
    return sameSlot(previous, next) ? [] : [{ actorId: actor.id, previous, next }];
  });
}

export function settingChanged(board: TimetableBoard, draft: BoardDraft): boolean {
  const original = draftFrom(board).setting;
  return JSON.stringify(original) !== JSON.stringify(draft.setting);
}

export function changeCount(board: TimetableBoard, draft: BoardDraft): number {
  return assignmentsOf(board, draft).length + (settingChanged(board, draft) ? 1 : 0);
}

/** 확정한 일정표를 저장할 때 보낼 문자. 이미 안내한 배우는 변경 안내, 새로 시간을 받은 배우는 첫 안내를 받는다. */
export function noticesOnSave(board: TimetableBoard, draft: BoardDraft): { changed: string[]; invited: string[] } {
  if (board.status !== "PUBLISHED") return { changed: [], invited: [] };
  const moved = new Set(assignmentsOf(board, draft).map((assignment) => assignment.actorId));
  return {
    changed: board.actors.filter((actor) => actor.invited && moved.has(actor.id)).map((actor) => actor.name),
    invited: board.actors.filter((actor) => !actor.invited && draft.slots[actor.id]).map((actor) => actor.name),
  };
}

export function isDirty(board: TimetableBoard, draft: BoardDraft): boolean {
  return changeCount(board, draft) > 0;
}

/**
 * 배우 등록·삭제처럼 저장 전 편집본을 두고 서버 보드만 새로 받았을 때 편집본을 새 보드 위로 옮긴다.
 * 기획사가 손대지 않은 값은 새 서버 값(그사이 배우가 직접 바꾼 시간 포함)을 따르고, 손댄 값만 유지한다.
 */
export function rebaseDraft(previous: TimetableBoard, next: TimetableBoard, draft: BoardDraft): BoardDraft {
  const before = draftFrom(previous);
  const after = draftFrom(next);
  const setting = JSON.stringify(draft.setting) === JSON.stringify(before.setting) ? after.setting : draft.setting;
  const slots = Object.fromEntries(next.actors.map((actor) => {
    const edited = actor.id in before.slots && draft.slots[actor.id] !== before.slots[actor.id];
    return [actor.id, edited ? draft.slots[actor.id] ?? null : after.slots[actor.id] ?? null];
  }));
  return { setting, slots };
}

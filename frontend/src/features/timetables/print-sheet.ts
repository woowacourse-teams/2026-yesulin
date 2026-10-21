import { toHm } from "./time";
import type { TimetableActor, TimetableBoard } from "./types";

export type PrintSlot = {
  readonly startTime: string;
  readonly endTime: string;
  readonly actors: readonly TimetableActor[];
};

export type PrintDay = {
  readonly date: string;
  readonly slots: readonly PrintSlot[];
};

export function printDays(board: TimetableBoard): readonly PrintDay[] {
  const days = new Map<string, Map<string, { endTime: string; actors: TimetableActor[] }>>();
  for (const actor of board.actors) {
    if (!actor.slot) continue;
    const slots = days.get(actor.slot.date) ?? new Map<string, { endTime: string; actors: TimetableActor[] }>();
    const startTime = toHm(actor.slot.startTime);
    const slot = slots.get(startTime) ?? { endTime: toHm(actor.slot.endTime), actors: [] };
    slot.actors.push(actor);
    slots.set(startTime, slot);
    days.set(actor.slot.date, slots);
  }
  return [...days.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, slots]) => ({
      date,
      slots: [...slots.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([startTime, slot]) => ({ startTime, endTime: slot.endTime, actors: slot.actors })),
    }));
}

export function checkItemsOf(input: string): readonly string[] {
  return [...new Set(input.split(/[,\n]/).map((item) => item.trim()).filter(Boolean))];
}

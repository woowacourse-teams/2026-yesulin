import { describe, expect, it } from "vitest";
import { checkItemsOf, printDays } from "./print-sheet";
import type { TimetableActor, TimetableBoard } from "./types";

const actor = (id: number, date: string | null, startTime = "10:00:00"): TimetableActor => ({
  id,
  name: `배우${id}`,
  phone: `010-0000-000${id}`,
  slot: date ? { date, startTime, endTime: startTime.replace(/^10/, "11") } : null,
  invited: true,
  attendance: "UNANSWERED",
  attendanceAnsweredAt: null,
  registeredAt: "2026-10-01T00:00:00Z",
});

describe("printDays", () => {
  it("날짜와 시간 순으로 묶고 미배정 배우는 뺀다", () => {
    const board = {
      actors: [actor(1, "2026-10-11", "10:00:00"), actor(2, "2026-10-10", "13:00:00"), actor(3, "2026-10-10", "10:00:00"),
        actor(4, null), actor(5, "2026-10-10", "10:00:00")],
    } as unknown as TimetableBoard;

    const days = printDays(board);

    expect(days.map((day) => day.date)).toEqual(["2026-10-10", "2026-10-11"]);
    expect(days[0].slots.map((slot) => [slot.startTime, slot.actors.map((item) => item.id)])).toEqual([
      ["10:00", [3, 5]],
      ["13:00", [2]],
    ]);
  });
});

describe("checkItemsOf", () => {
  it("쉼표나 줄바꿈으로 나누고 빈 항목과 중복을 뺀다", () => {
    expect(checkItemsOf(" MR, 프로필 ,,MR\n대본")).toEqual(["MR", "프로필", "대본"]);
  });
});

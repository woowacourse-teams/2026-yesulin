import { describe, expect, it } from "vitest";
import { addDays, formatDate, formatInstant, formatSlot, monthGrid, shiftMonth, slotsOf, toHm, todayInSeoul } from "./time";

describe("timetable time", () => {
  it("서버와 같은 규칙으로 시간대마다 칸을 나누고 시간순으로 정렬한다", () => {
    expect(slotsOf({
      slotMinutes: 25,
      windows: [
        { date: "2026-10-11", startTime: "14:00", endTime: "15:00" },
        { date: "2026-10-10", startTime: "10:00", endTime: "11:00" },
      ],
    })).toEqual([
      { date: "2026-10-10", startTime: "10:00" },
      { date: "2026-10-10", startTime: "10:25" },
      { date: "2026-10-11", startTime: "14:00" },
      { date: "2026-10-11", startTime: "14:25" },
    ]);
  });

  it("서버 시각의 초를 떼고 한국어 날짜로 보여 준다", () => {
    expect(toHm("10:30:00")).toBe("10:30");
    expect(formatDate("2026-10-10")).toBe("10월 10일 (토)");
    expect(formatSlot({ date: "2026-10-10", startTime: "09:05:00" })).toBe("10월 10일 (토) 09:05");
    expect(formatInstant("2026-10-09T01:00:00Z")).toBe("10월 9일 (금) 10:00");
  });

  it("한국 날짜 기준으로 오늘과 날짜 계산을 한다", () => {
    expect(todayInSeoul(new Date("2026-10-03T16:00:00Z"))).toBe("2026-10-04");
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
  });

  it("일요일부터 시작하는 달력 칸을 만들고 달을 넘긴다", () => {
    const grid = monthGrid("2026-10");

    expect(grid.slice(0, 5)).toEqual([null, null, null, null, "2026-10-01"]);
    expect(grid.at(-1)).toBe("2026-10-31");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
  });
});

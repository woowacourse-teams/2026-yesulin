import { describe, expect, it } from "vitest";
import { formatShowDateTime, formatShowFullDateTime, formatShowPeriod, sessionAvailability } from "./format";

describe("show format", () => {
  it("UTC 회차 시각을 한국 시간과 요일로 표시한다", () => {
    expect(formatShowDateTime("2026-10-01T10:30:00Z")).toBe("10월 1일 (목) 19:30");
    expect(formatShowFullDateTime("2026-09-30T15:10:00Z")).toBe("2026년 10월 1일 (목) 00:10");
  });

  it("회차가 하루뿐이면 날짜 하나만, 여러 날이면 기간으로 표시한다", () => {
    expect(formatShowPeriod([{ startsAt: "2026-10-01T10:00:00Z" }, { startsAt: "2026-10-01T05:00:00Z" }]))
      .toBe("10월 1일 (목)");
    expect(formatShowPeriod([{ startsAt: "2026-10-03T10:00:00Z" }, { startsAt: "2026-10-01T10:00:00Z" }]))
      .toBe("10월 1일 (목) ~ 10월 3일 (토)");
    expect(formatShowPeriod([])).toBe("회차 준비 중");
  });

  it("매진을 마감보다 먼저 표시하고 적은 잔여석을 따로 구분한다", () => {
    expect(sessionAvailability({ remainingSeats: 0, bookable: false })).toEqual({ kind: "soldOut", label: "매진" });
    expect(sessionAvailability({ remainingSeats: 5, bookable: false })).toEqual({ kind: "closed", label: "예매 마감" });
    expect(sessionAvailability({ remainingSeats: 2, bookable: true })).toEqual({ kind: "few", label: "잔여 2석" });
    expect(sessionAvailability({ remainingSeats: 40, bookable: true })).toEqual({ kind: "available", label: "잔여 40석" });
  });
});

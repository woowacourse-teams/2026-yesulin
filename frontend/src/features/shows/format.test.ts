import { describe, expect, it } from "vitest";
import {
  formatShowDateTime,
  formatShowFullDateTime,
  formatShowPeriod,
  fromKstDateTimeInput,
  sessionAvailability,
  showAvailability,
  toKstDateTimeInput,
} from "./format";

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
    expect(sessionAvailability({ remainingSeats: 0, maxTicketCount: 0, bookable: false })).toEqual({ kind: "soldOut", label: "매진" });
    expect(sessionAvailability({ remainingSeats: 5, maxTicketCount: 5, bookable: false })).toEqual({ kind: "closed", label: "예매 마감" });
    expect(sessionAvailability({ remainingSeats: 2, maxTicketCount: 2, bookable: true })).toEqual({ kind: "few", label: "잔여 2석" });
    expect(sessionAvailability({ remainingSeats: 40, maxTicketCount: 10, bookable: true })).toEqual({ kind: "available", label: "잔여 40석" });
  });

  it("잔여석을 숨긴 공연은 숫자 없이 예매 가능·매진·마감만 표시한다", () => {
    expect(sessionAvailability({ remainingSeats: null, maxTicketCount: 3, bookable: true })).toEqual({ kind: "available", label: "예매 가능" });
    expect(sessionAvailability({ remainingSeats: null, maxTicketCount: 0, bookable: false })).toEqual({ kind: "soldOut", label: "매진" });
    expect(sessionAvailability({ remainingSeats: null, maxTicketCount: 10, bookable: false })).toEqual({ kind: "closed", label: "예매 마감" });
  });

  it("한국 시간 입력값과 UTC ISO 문자열을 서로 바꾼다", () => {
    expect(fromKstDateTimeInput("2026-10-01T19:30")).toBe("2026-10-01T10:30:00.000Z");
    expect(fromKstDateTimeInput("2026-10-01T00:10")).toBe("2026-09-30T15:10:00.000Z");
    expect(fromKstDateTimeInput("2026-10-01")).toBeNull();
    expect(toKstDateTimeInput("2026-09-30T15:10:00Z")).toBe("2026-10-01T00:10");
  });

  it("공연 상태는 예매 가능 여부와 매진·마감을 구분한다", () => {
    const now = Date.parse("2026-09-28T00:00:00Z");
    const future = "2026-10-01T10:00:00Z";
    const past = "2026-09-27T10:00:00Z";
    expect(showAvailability({ status: "CLOSED", sessions: [{ id: 1, startsAt: future, remainingSeats: 5, maxTicketCount: 5, bookable: false }] }, now).label).toBe("예매 종료");
    expect(showAvailability({ status: "OPEN", sessions: [{ id: 1, startsAt: future, remainingSeats: 5, maxTicketCount: 5, bookable: true }] }, now).kind).toBe("open");
    expect(showAvailability({ status: "OPEN", sessions: [{ id: 1, startsAt: future, remainingSeats: 0, maxTicketCount: 0, bookable: false }] }, now).label).toBe("매진");
    expect(showAvailability({ status: "OPEN", sessions: [{ id: 1, startsAt: future, remainingSeats: null, maxTicketCount: 0, bookable: false }] }, now).label).toBe("매진");
    expect(showAvailability({ status: "OPEN", sessions: [{ id: 1, startsAt: past, remainingSeats: 3, maxTicketCount: 3, bookable: false }] }, now).label).toBe("예매 마감");
    expect(showAvailability({ status: "OPEN", sessions: [] }, now).label).toBe("회차 준비 중");
  });
});

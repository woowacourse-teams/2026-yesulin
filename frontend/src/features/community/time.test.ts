import { describe, expect, it } from "vitest";
import { relativeTime } from "./time";

const now = Date.parse("2026-11-03T12:00:00+09:00");

describe("relativeTime", () => {
  it("1분 미만은 방금으로 표시한다", () => {
    expect(relativeTime("2026-11-03T11:59:30+09:00", now)).toBe("방금");
  });

  it("분·시간·일 단위로 줄여 표시한다", () => {
    expect(relativeTime("2026-11-03T11:48:00+09:00", now)).toBe("12분");
    expect(relativeTime("2026-11-03T09:00:00+09:00", now)).toBe("3시간");
    expect(relativeTime("2026-10-31T12:00:00+09:00", now)).toBe("3일");
  });

  it("일주일이 지나면 날짜로, 해가 다르면 연도까지 표시한다", () => {
    expect(relativeTime("2026-10-20T12:00:00+09:00", now)).toBe("10월 20일");
    expect(relativeTime("2025-12-24T12:00:00+09:00", now)).toBe("2025년 12월 24일");
  });

  it("서버 시계가 앞서도 미래 시각을 음수로 보이지 않는다", () => {
    expect(relativeTime("2026-11-03T12:00:30+09:00", now)).toBe("방금");
  });
});

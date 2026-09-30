import { describe, expect, it } from "vitest";
import { recentLogDates } from "./log-dates";

describe("recentLogDates", () => {
  it("한국 날짜 기준으로 오늘부터 지난 날짜를 만든다", () => {
    // 2026-09-30 16:00 UTC는 한국 시간 10월 1일 01:00이다.
    const dates = recentLogDates(Date.parse("2026-09-30T16:00:00Z"), 3);

    expect(dates.map((date) => date.value)).toEqual([null, "2026-09-30", "2026-09-29"]);
    expect(dates[0]?.label.startsWith("오늘")).toBe(true);
  });
});

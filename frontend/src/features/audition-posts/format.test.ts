import { describe, expect, it } from "vitest";
import { deadlineBadge, formatDeadline, formatFileSize, formatPostedDate, kstToday } from "./format";

describe("audition post format", () => {
  it("작성 시각을 한국 날짜로 표시한다", () => {
    expect(formatPostedDate("2026-10-03T16:30:00Z")).toBe("2026.10.04");
    expect(formatPostedDate(null)).toBe("");
    expect(kstToday(new Date("2026-10-03T15:00:00Z"))).toBe("2026-10-04");
  });

  it("서버 마감 여부를 먼저 보고 날짜 마감은 남은 일수를 붙인다", () => {
    const today = "2026-10-04";
    expect(deadlineBadge({ closed: true, deadline: "2026-10-01", deadlineText: "2026-10-01" }, today))
      .toEqual({ kind: "closed", label: "마감" });
    expect(deadlineBadge({ closed: false, deadline: "2026-10-04", deadlineText: "2026-10-04" }, today))
      .toEqual({ kind: "today", label: "오늘 마감" });
    expect(deadlineBadge({ closed: false, deadline: "2026-10-06", deadlineText: "2026-10-06" }, today))
      .toEqual({ kind: "soon", label: "D-2" });
    expect(deadlineBadge({ closed: false, deadline: "2026-10-31", deadlineText: "2026-10-31" }, today))
      .toEqual({ kind: "open", label: "D-27" });
    expect(deadlineBadge({ closed: false, deadline: null, deadlineText: "채용 시 마감" }, today))
      .toEqual({ kind: "text", label: "채용 시 마감" });
  });

  it("날짜가 아닌 마감은 원문을 그대로 쓴다", () => {
    expect(formatDeadline({ deadline: "2026-10-31", deadlineText: "2026-10-31" })).toBe("10월 31일까지");
    expect(formatDeadline({ deadline: null, deadlineText: "" })).toBe("상시");
  });

  it("파일 크기를 읽기 쉬운 단위로 줄인다", () => {
    expect(formatFileSize(512)).toBe("512B");
    expect(formatFileSize(44_544)).toBe("43.5KB");
    expect(formatFileSize(5 * 1024 * 1024)).toBe("5.0MB");
  });
});

import { describe, expect, it } from "vitest";
import { koreaToday, moveOpenChatPeriod, openChatPostedRange } from "./openchat-period";

describe("오픈채팅 공고 게시일 기간", () => {
  it("한국 자정부터 새 날짜를 사용한다", () => {
    expect(koreaToday(new Date("2026-10-23T14:59:59Z"))).toBe("2026-10-23");
    expect(koreaToday(new Date("2026-10-23T15:00:00Z"))).toBe("2026-10-24");
  });

  it("일간은 하루, 주간은 연도를 넘더라도 월요일부터 일요일까지다", () => {
    expect(openChatPostedRange("DAY", "2026-10-24")).toEqual({ startDate: "2026-10-24", endDate: "2026-10-24" });
    expect(openChatPostedRange("WEEK", "2027-01-03")).toEqual({ startDate: "2026-12-28", endDate: "2027-01-03" });
    expect(openChatPostedRange("WEEK", "2027-01-04")).toEqual({ startDate: "2027-01-04", endDate: "2027-01-10" });
    expect(openChatPostedRange("ALL", "2026-10-24")).toBeNull();
  });

  it("월간은 윤년의 말일을 포함하며 31일에서 이동해도 다음 달을 건너뛰지 않는다", () => {
    expect(openChatPostedRange("MONTH", "2028-02-15")).toEqual({ startDate: "2028-02-01", endDate: "2028-02-29" });
    expect(moveOpenChatPeriod("MONTH", "2027-01-31", 1)).toBe("2027-02-01");
    expect(moveOpenChatPeriod("MONTH", "2027-01-31", -1)).toBe("2026-12-01");
    expect(moveOpenChatPeriod("WEEK", "2027-01-03", 1)).toBe("2027-01-04");
    expect(moveOpenChatPeriod("DAY", "2027-01-01", -1)).toBe("2026-12-31");
  });
});

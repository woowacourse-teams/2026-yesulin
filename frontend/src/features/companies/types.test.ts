import { describe, expect, it } from "vitest";
import { companyRoutes, displayLink, formatFoundedOn } from "./types";

describe("공연사 표시", () => {
  it("설립일을 한국어 날짜로 보여 준다", () => {
    expect(formatFoundedOn("2015-03-01")).toBe("2015년 3월 1일");
    expect(formatFoundedOn("미상")).toBe("미상");
  });

  it("링크 주소에서 프로토콜·www·끝 슬래시를 뺀다", () => {
    expect(displayLink("https://www.yesulin.art/")).toBe("yesulin.art");
    expect(displayLink("http://example.com/troupe")).toBe("example.com/troupe");
    expect(displayLink("주소 아님")).toBe("주소 아님");
  });

  it("공연사 화면 주소를 만든다", () => {
    expect(companyRoutes.detail(12)).toBe("/companies/12");
  });
});

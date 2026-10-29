import { describe, expect, it } from "vitest";
import { buildAnalyticsContext, parseFormAttachments } from "./server-context";
import { activeSlice } from "./review-timer";

describe("분석 집계 계약", () => {
  it("회원 원문 ID를 노출하지 않고 환경별 비밀값으로 서로 다른 ID를 만든다", () => {
    const user = { memberId: 12, role: "PRODUCER" };
    const a = buildAnalyticsContext(user, { secret: "a".repeat(32), internalIds: "11,12" });
    const b = buildAnalyticsContext(user, { secret: "b".repeat(32) });
    expect(a.identity).toMatch(/^[a-f0-9]{64}$/); expect(a.identity).not.toBe(b.identity);
    expect(a.internal).toBe(true); expect(b.internal).toBe(false);
    expect(a).not.toHaveProperty("memberId");
  });
  it("관리자는 항상 제외하고 일반 공연사 권한만으로는 제외하지 않는다", () => {
    expect(buildAnalyticsContext({ memberId: 1, role: "ADMIN" }, { secret: "a".repeat(32) }).internal).toBe(true);
    expect(buildAnalyticsContext({ memberId: 1, role: "PRODUCER" }, { secret: "a".repeat(32) }).internal).toBe(false);
  });
  it("비밀값 없는 로그인과 잘못된 양식 분류는 조용히 수집하지 않는다", () => {
    expect(() => buildAnalyticsContext({ memberId: 1, role: "APPLICANT" }, {})).toThrow();
    expect(() => parseFormAttachments('{"10":[-1]}')).toThrow();
    expect(parseFormAttachments('{"10":[0,2]}')).toEqual({ "10": [0,2] });
  });
  it("숨긴 탭·오래 방치한 시간과 음수 시간을 심사 시간에 넣지 않는다", () => {
    expect(activeSlice(0, 10_000, 0, true)).toBe(10_000);
    expect(activeSlice(0, 10_000, 0, false)).toBe(0);
    expect(activeSlice(110_000, 150_000, 0, true)).toBe(10_000);
    expect(activeSlice(150_000, 180_000, 0, true)).toBe(0);
    expect(activeSlice(10_000, 5_000, 0, true)).toBe(0);
  });
});

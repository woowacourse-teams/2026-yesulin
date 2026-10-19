import { describe, expect, it } from "vitest";
import { alertReaderCount, publicViewCount, viewCountClock } from "./view-count";

const POSTED_AT = "2026-10-01T03:00:00Z";
const POSTED_MS = Date.parse(POSTED_AT);
const HOUR_MS = 60 * 60 * 1000;
const postIds = Array.from({ length: 60 }, (_, index) => index + 1);

describe("공개 조회수", () => {
  it("공고마다 오픈채팅 109명의 20~35% 안에서 다르게 끝난다", () => {
    const finals = postIds.map((id) => alertReaderCount(id, POSTED_AT, POSTED_MS + 60 * 24 * HOUR_MS));
    for (const count of finals) {
      expect(count).toBeGreaterThanOrEqual(22);
      expect(count).toBeLessThanOrEqual(38);
    }
    expect(new Set(finals).size).toBeGreaterThan(5);
  });

  it("게시 직후 0에서 시작해 시간이 지나면 줄지 않고 늘어난다", () => {
    for (const id of postIds) {
      expect(alertReaderCount(id, POSTED_AT, POSTED_MS)).toBe(0);
      let previous = 0;
      for (let hour = 1; hour <= 24 * 14; hour++) {
        const count = alertReaderCount(id, POSTED_AT, POSTED_MS + hour * HOUR_MS);
        expect(count).toBeGreaterThanOrEqual(previous);
        previous = count;
      }
    }
  });

  it("같은 공고와 시각이면 항상 같은 값이다", () => {
    const now = POSTED_MS + 5 * HOUR_MS;
    expect(alertReaderCount(7, POSTED_AT, now)).toBe(alertReaderCount(7, POSTED_AT, now));
  });

  it("게시 시각을 모르면 모두 확인한 것으로 본다", () => {
    const final = alertReaderCount(3, POSTED_AT, POSTED_MS + 60 * 24 * HOUR_MS);
    expect(alertReaderCount(3, null, POSTED_MS)).toBe(final);
    expect(alertReaderCount(3, "잘못된 시각", POSTED_MS)).toBe(final);
  });

  it("실제 조회수가 추정치보다 크면 실제 값을 쓴다", () => {
    const now = POSTED_MS + 60 * 24 * HOUR_MS;
    const estimate = alertReaderCount(9, POSTED_AT, now);
    expect(publicViewCount({ id: 9, viewCount: 3, postedAt: POSTED_AT }, now)).toBe(estimate);
    expect(publicViewCount({ id: 9, viewCount: 120, postedAt: POSTED_AT }, now)).toBe(120);
  });

  it("계산 시각은 10분 단위로 자른다", () => {
    expect(viewCountClock(Date.parse("2026-10-19T05:17:42Z"))).toBe(Date.parse("2026-10-19T05:10:00Z"));
  });
});

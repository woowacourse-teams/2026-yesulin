import { beforeEach, describe, expect, it, vi } from "vitest";
import { badgeLabel, ensureCategorySeen, markCategorySeen, newPostCounts } from "./category-seen";
import type { AuditionPostSummary } from "./types";

const post = (id: number, category: string, postedAt: string | null) => ({ id, category, postedAt }) as AuditionPostSummary;

beforeEach(() => {
  const values = new Map<string, string>();
  vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) });
});

describe("분야별 새 공고 배지", () => {
  it("첫 방문에는 모든 분야를 지금 본 것으로 기록해 배지를 띄우지 않는다", () => {
    const seen = ensureCategorySeen(new Date("2026-11-04T10:00:00Z"));
    expect(newPostCounts([post(1, "연극", "2026-11-04T09:00:00Z")], seen)).toEqual({});
  });

  it("마지막 확인 이후 올라온 공고만 분야별로 센다", () => {
    ensureCategorySeen(new Date("2026-11-04T10:00:00Z"));
    const seen = ensureCategorySeen(new Date("2026-11-05T10:00:00Z"));
    expect(newPostCounts([
      post(1, "연극", "2026-11-04T11:00:00Z"),
      post(2, "연극", "2026-11-04T12:00:00Z"),
      post(3, "뮤지컬", "2026-11-04T09:00:00Z"),
      post(4, "뮤지컬", null),
    ], seen)).toEqual({ 연극: 2 });
  });

  it("분야를 확인하면 그 분야만 다시 센다", () => {
    ensureCategorySeen(new Date("2026-11-04T10:00:00Z"));
    markCategorySeen("연극", new Date("2026-11-04T13:00:00Z"));
    const seen = ensureCategorySeen();
    expect(newPostCounts([post(1, "연극", "2026-11-04T11:00:00Z"), post(2, "뮤지컬", "2026-11-04T11:00:00Z")], seen)).toEqual({ 뮤지컬: 1 });
  });

  it("배지 숫자는 99에서 멈춘다", () => {
    expect(badgeLabel(3)).toBe("+3");
    expect(badgeLabel(140)).toBe("+99");
  });
});

describe("저장소를 쓸 수 없을 때", () => {
  it("배지 없이 동작한다", () => {
    vi.stubGlobal("localStorage", { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } });
    expect(newPostCounts([post(1, "연극", "2026-11-04T09:00:00Z")], ensureCategorySeen(new Date("2026-11-04T10:00:00Z")))).toEqual({});
  });
});

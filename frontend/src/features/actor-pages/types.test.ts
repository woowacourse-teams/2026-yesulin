import { describe, expect, it } from "vitest";
import {
  ACTOR_SEARCH_MAX_LENGTH,
  actorBodyLine,
  actorIdentityLine,
  actorPageApiPaths,
  actorPageRoutes,
  emptyListRecovery,
  isActorHandleAddress,
  parseActorListKeyword,
  parseActorListPage,
} from "./types";

describe("actor handle address", () => {
  it.each(["minzzun.__", "a", "a".repeat(30), "MinZzun", "min_zzun.kim"])("accepts %s", (handle) => {
    expect(isActorHandleAddress(handle)).toBe(true);
  });

  it.each([".minzzun", "minzzun.", "min..zzun", "a".repeat(31), "민준", "min-zzun", ""])("rejects %s", (handle) => {
    expect(isActorHandleAddress(handle)).toBe(false);
  });
});

describe("actor list page", () => {
  it("reads the one-based page in the address", () => {
    expect(parseActorListPage("2")).toBe(1);
    expect(parseActorListPage(["3", "4"])).toBe(2);
  });

  it.each([undefined, "0", "-1", "1.5", "abc", "10001"])("falls back to the first page for %s", (value) => {
    expect(parseActorListPage(value)).toBe(0);
  });

  it("omits the query on the first page", () => {
    expect(actorPageRoutes.list()).toBe("/actors");
    expect(actorPageRoutes.list(1)).toBe("/actors?page=2");
  });

  it("keeps the search keyword in the address and the api path", () => {
    expect(actorPageRoutes.list(0, "다정")).toBe("/actors?q=%EB%8B%A4%EC%A0%95");
    expect(actorPageRoutes.list(2, "dajeong_y")).toBe("/actors?q=dajeong_y&page=3");
    expect(actorPageApiPaths.list(0, 12, "a&b")).toBe("/v1/public/actor-pages?page=0&size=12&sort=recent&q=a%26b");
    expect(actorPageApiPaths.list(0)).not.toContain("q=");
  });
});

describe("empty list recovery", () => {
  it("sends a later page back to the first page of the same search", () => {
    expect(emptyListRecovery(2, "다정")).toEqual({ href: "/actors?q=%EB%8B%A4%EC%A0%95", label: "첫 페이지로" });
    expect(emptyListRecovery(1, "")).toEqual({ href: "/actors", label: "첫 페이지로" });
  });

  it("sends an empty search result to the full list, not back to the same search", () => {
    expect(emptyListRecovery(0, "zzzz")).toEqual({ href: "/actors", label: "전체 배우 보기" });
  });

  it("offers nothing when the whole list is empty", () => {
    expect(emptyListRecovery(0, "")).toBeNull();
  });
});

describe("actor list keyword", () => {
  it("trims spaces and the handle at sign", () => {
    expect(parseActorListKeyword("  @dajeong_y ")).toBe("dajeong_y");
    expect(parseActorListKeyword(["김다정", "무시"])).toBe("김다정");
  });

  it.each([undefined, "", "   ", "@"])("treats %s as no keyword", (value) => {
    expect(parseActorListKeyword(value)).toBe("");
  });

  it("cuts the keyword at the server limit", () => {
    expect(parseActorListKeyword("가".repeat(40))).toHaveLength(ACTOR_SEARCH_MAX_LENGTH);
  });

  it("does not leave half of an emoji when the cut lands inside it", () => {
    const keyword = parseActorListKeyword(`${"a".repeat(ACTOR_SEARCH_MAX_LENGTH - 1)}😀`);

    expect(keyword).toBe("a".repeat(ACTOR_SEARCH_MAX_LENGTH - 1));
    expect(() => encodeURIComponent(keyword)).not.toThrow();
    expect(parseActorListKeyword(`${"a".repeat(ACTOR_SEARCH_MAX_LENGTH - 2)}😀`)).toHaveLength(ACTOR_SEARCH_MAX_LENGTH);
  });
});

describe("actor profile lines", () => {
  it("shows gender, birth year and age", () => {
    expect(actorIdentityLine({ gender: "FEMALE", birthYear: 2000, age: 25 })).toBe("여성 · 2000년생(만 25세)");
  });

  it("shows only the body values the actor entered", () => {
    expect(actorBodyLine({ height: 170, weight: 55 })).toBe("170cm · 55kg");
    expect(actorBodyLine({ height: null, weight: 55 })).toBe("55kg");
    expect(actorBodyLine({ height: null, weight: null })).toBeNull();
  });
});

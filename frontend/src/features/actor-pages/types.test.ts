import { describe, expect, it } from "vitest";
import { actorBodyLine, actorIdentityLine, actorPageRoutes, isActorHandleAddress, parseActorListPage } from "./types";

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

import { describe, expect, it } from "vitest";
import { auditionLandingCategory, auditionPostApiPaths, auditionPostRoutes } from "./types";

describe("분야별 공고 주소", () => {
  it("페이지와 마감 조건을 바꿔도 분야 주소를 유지한다", () => {
    expect(auditionPostRoutes.list({ category: "뮤지컬", page: 1, includeClosed: true }))
      .toBe("/auditions/musical?closed=1&page=2");
    expect(auditionPostRoutes.list({ category: "연극" })).toBe("/auditions/theater");
    expect(auditionPostRoutes.list({ page: 1 })).toBe("/?page=2");
    const url = new URL(auditionPostApiPaths.list({ page: 1, includeClosed: true, category: "연극" }), "https://example.com");
    expect(url.searchParams.get("category")).toBe("연극");
    expect(url.searchParams.get("page")).toBe("1");
    expect(url.searchParams.get("includeClosed")).toBe("true");
  });

  it("알 수 없는 분야와 객체의 기본 속성을 공개 페이지로 받지 않는다", () => {
    expect(auditionLandingCategory("musical")).toBe("뮤지컬");
    expect(auditionLandingCategory("theater")).toBe("연극");
    expect(auditionLandingCategory("film")).toBeUndefined();
    expect(auditionLandingCategory("toString")).toBeUndefined();
  });
});

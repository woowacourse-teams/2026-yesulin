import { describe, expect, it } from "vitest";
import { auditionLandingCategory, auditionPostApiPaths, auditionPostRoutes, parseAuditionPostQuery } from "./types";

describe("분야별 공고 주소", () => {
  it("페이지와 마감 조건을 바꿔도 분야 주소를 유지한다", () => {
    expect(auditionPostRoutes.list({ category: "뮤지컬", page: 1, includeClosed: true }))
      .toBe("/auditions/musical?closed=1&page=2");
    expect(auditionPostRoutes.list({ category: "연극" })).toBe("/auditions/theater");
    expect(auditionPostRoutes.list({ page: 1 })).toBe("/auditions?page=2");
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

describe("공고 정렬 주소", () => {
  it("마감순·분야·모집 상태·페이지를 화면과 API 주소에 함께 유지한다", () => {
    const query = { category: "연극", page: 2, includeClosed: true, sort: "deadline" } as const;
    expect(auditionPostRoutes.list(query)).toBe("/auditions/theater?closed=1&page=3&sort=deadline");
    const api = new URL(auditionPostApiPaths.list(query), "https://example.com");
    expect(Object.fromEntries(api.searchParams)).toEqual({ page: "2", size: "12", includeClosed: "true", category: "연극", sort: "deadline" });
    expect(parseAuditionPostQuery({ page: "3", closed: "1", sort: "deadline" }))
      .toEqual({ page: 2, includeClosed: true, sort: "deadline" });
  });

  it("최신순 기본값은 생략하고 지원하지 않는 주소 값도 최신순으로 읽는다", () => {
    expect(auditionPostRoutes.list({ sort: "latest" })).toBe("/auditions");
    expect(auditionPostApiPaths.list({ page: 0, includeClosed: false, sort: "latest" })).not.toContain("sort=");
    expect(parseAuditionPostQuery({ sort: "unknown" })).toEqual({ page: 0, includeClosed: false });
    expect(parseAuditionPostQuery({ sort: ["deadline", "latest"] })).toEqual({ page: 0, includeClosed: false, sort: "deadline" });
  });
});

describe("기존 API 분류의 공개 탐색", () => {
  it.each([
    ["performance", "퍼포먼스"], ["troupe", "단원"], ["agency", "기획사"],
  ] as const)("%s 경로에서 서버 분류 %s와 조회 조건을 유지한다", (slug, category) => {
    expect(auditionLandingCategory(slug)).toBe(category);
    expect(auditionPostRoutes.list({ category, page: 2, includeClosed: true })).toBe(`/auditions/${slug}?closed=1&page=3`);
    const url = new URL(auditionPostApiPaths.list({ category, page: 2, includeClosed: true }), "https://example.com");
    expect(url.searchParams.get("category")).toBe(category);
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("includeClosed")).toBe("true");
  });
});

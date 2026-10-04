import { describe, expect, it } from "vitest";
import { pageItems } from "./pagination";
import { auditionPostRoutes, parseAuditionPostQuery } from "./types";

const labels = (current: number, total: number) =>
  pageItems(current, total).map((item) => item.kind === "page" ? String(item.page + 1) : "…").join(" ");

describe("audition post pagination", () => {
  it("7쪽 이하는 모두, 그보다 많으면 현재 앞뒤와 처음·끝만 보여 준다", () => {
    expect(labels(0, 3)).toBe("1 2 3");
    expect(labels(0, 10)).toBe("1 2 3 4 … 10");
    expect(labels(4, 10)).toBe("1 … 4 5 6 … 10");
    expect(labels(9, 10)).toBe("1 … 7 8 9 10");
  });

  it("주소의 1부터 세는 page와 마감 포함 여부를 서버 조건으로 바꾼다", () => {
    expect(parseAuditionPostQuery({})).toEqual({ page: 0, includeClosed: false });
    expect(parseAuditionPostQuery({ page: "3", closed: "1" })).toEqual({ page: 2, includeClosed: true });
    expect(parseAuditionPostQuery({ page: "-1" })).toEqual({ page: 0, includeClosed: false });
    expect(parseAuditionPostQuery({ page: "abc" })).toEqual({ page: 0, includeClosed: false });
  });

  it("기본 조건은 주소에서 빼고 나머지만 붙인다", () => {
    expect(auditionPostRoutes.list()).toBe("/");
    expect(auditionPostRoutes.list({ page: 1 })).toBe("/?page=2");
    expect(auditionPostRoutes.list({ page: 0, includeClosed: true })).toBe("/?closed=1");
    expect(auditionPostRoutes.detail(42)).toBe("/posts/42");
  });
});

import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { setupServer } from "msw/node";
import type { AuditionPostPage } from "@/features/audition-posts/types";
import { auditionPostHandlers } from "./audition-post-handlers";

const server = setupServer(...auditionPostHandlers);
const base = "http://localhost/api/v1/public/audition-posts";

beforeAll(() => {
  vi.stubGlobal("location", new URL("http://localhost"));
  server.listen({ onUnhandledRequest: "error" });
});

afterAll(() => {
  server.close();
  vi.unstubAllGlobals();
});

async function list(query: string): Promise<AuditionPostPage> {
  const response = await fetch(`${base}?${query}`);
  expect(response.status).toBe(200);
  return response.json() as Promise<AuditionPostPage>;
}

describe("공고 목록 목의 정렬", () => {
  it("오래된 글도 마감이 빠르면 첫 페이지로 올라오고 다음 페이지와 중복되지 않는다", async () => {
    const latest = await list("size=1");
    const first = await list("size=1&sort=deadline");
    const second = await list("size=1&page=1&sort=deadline");
    expect(latest.posts.map((post) => post.id)).toEqual([1]);
    expect(first.posts.map((post) => post.id)).toEqual([5]);
    expect(second.posts.map((post) => post.id)).toEqual([1]);
    expect(first.totalElements).toBe(4);
  });

  it("날짜 없는 모집은 날짜 있는 모집 뒤, 지난 마감은 맨 뒤에 둔다", async () => {
    const result = await list("sort=deadline&includeClosed=true");
    expect(result.posts.map((post) => post.id)).toEqual([5, 1, 2, 3, 4]);
    expect(result.openCount).toBe(4);
    expect(result.allCount).toBe(5);
  });

  it("분야 필터와 정렬을 함께 적용한다", async () => {
    const result = await list(`sort=deadline&category=${encodeURIComponent("연극")}`);
    expect(result.posts.map((post) => post.id)).toEqual([5, 1, 2]);
    expect(result.totalElements).toBe(3);
  });

  it("지원하지 않는 API 정렬은 400으로 응답한다", async () => {
    const response = await fetch(`${base}?sort=unknown`);
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ code: "INVALID_REQUEST" });
  });
});

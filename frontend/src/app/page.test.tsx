import { beforeEach, describe, expect, it, vi } from "vitest";

const { redirect, readPosts, readShows, readEventBanners } = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => { throw new Error(`redirect:${url}`); }),
  readPosts: vi.fn(async () => null),
  readShows: vi.fn(async () => []),
  readEventBanners: vi.fn(async () => []),
}));
vi.mock("next/navigation", () => ({ redirect, usePathname: () => "/" }));
vi.mock("@/features/audition-posts/server", () => ({ auditionPostPageForServer: readPosts }));
vi.mock("@/features/shows/server", () => ({ publicShowsForServer: readShows }));
vi.mock("@/features/events/server", () => ({ eventBannersForServer: readEventBanners }));

import HomePage, { metadata } from "./page";

beforeEach(() => vi.clearAllMocks());

describe("메인과 과거 공고 목록 주소", () => {
  it("기본 메인은 첫 모집 중 공고와 공연을 조회하고 홈 canonical을 유지한다", async () => {
    await HomePage({ searchParams: Promise.resolve({}) });
    expect(readPosts).toHaveBeenCalledWith({ page: 0, includeClosed: false });
    expect(readShows).toHaveBeenCalledOnce();
    expect(readEventBanners).toHaveBeenCalledOnce();
    expect(redirect).not.toHaveBeenCalled();
    expect(metadata.alternates?.canonical).toBe("/");
  });

  it.each([
    [{ page: "2", closed: "1" }, "/auditions?closed=1&page=2"],
    [{ closed: "1" }, "/auditions?closed=1"],
  ])("기존 공유 목록 조건 %j를 새 전용 목록으로 보낸다", async (params, target) => {
    await expect(HomePage({ searchParams: Promise.resolve(params) })).rejects.toThrow(`redirect:${target}`);
    expect(readPosts).not.toHaveBeenCalled();
    expect(readShows).not.toHaveBeenCalled();
  });
});

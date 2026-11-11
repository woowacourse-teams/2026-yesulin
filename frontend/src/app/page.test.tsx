import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { readPosts, readShows, readEventBanners, renderHome } = vi.hoisted(() => ({
  readPosts: vi.fn(async () => null),
  readShows: vi.fn(async () => []),
  readEventBanners: vi.fn(async () => []),
  renderHome: vi.fn<(props: Record<string, unknown>) => null>().mockReturnValue(null),
}));
vi.mock("@/components/audition-posts/audition-post-home", () => ({ AuditionPostHome: renderHome }));
vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("@/features/audition-posts/server", () => ({ auditionPostPageForServer: readPosts }));
vi.mock("@/features/shows/server", () => ({ publicShowsForServer: readShows }));
vi.mock("@/features/events/server", () => ({ eventBannersForServer: readEventBanners }));

import HomePage, { metadata, revalidate } from "./page";

beforeEach(() => vi.clearAllMocks());

describe("메인 공개 데이터", () => {
  it("두 공고 목록과 공연·배너에만 홈의 ISR 주기를 전달하고 홈 canonical을 유지한다", async () => {
    await HomePage();
    const cacheOptions = { next: { revalidate } };
    expect(readPosts).toHaveBeenCalledWith({ page: 0, includeClosed: false }, 48, cacheOptions);
    expect(readPosts).toHaveBeenCalledWith({ page: 0, includeClosed: false, sort: "deadline" }, 12, cacheOptions);
    expect(readShows).toHaveBeenCalledExactlyOnceWith(cacheOptions);
    expect(readEventBanners).toHaveBeenCalledExactlyOnceWith(cacheOptions);
    expect(metadata.alternates?.canonical).toBe("/");
    expect(metadata.openGraph).toMatchObject({ url: "/" });
  });

  it("공연·배너 조회 실패를 브라우저에서 다시 읽을 수 있는 초기 상태로 넘긴다", async () => {
    readShows.mockRejectedValueOnce(new Error("공연 조회 실패"));
    readEventBanners.mockRejectedValueOnce(new Error("배너 조회 실패"));
    renderToStaticMarkup(await HomePage());
    expect(renderHome.mock.calls[0]?.[0]).toMatchObject({ initialShows: null, initialEventBanners: null });
  });
});

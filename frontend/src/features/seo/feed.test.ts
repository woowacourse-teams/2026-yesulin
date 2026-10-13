import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { publicFeedItems } from "./feed";
import { GET } from "@/app/rss.xml/route";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

beforeEach(() => {
  vi.stubEnv("API_ORIGIN", "https://api.example.com");
  vi.stubEnv("NEXT_PUBLIC_API_MOCKING", "");
});
afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("공개 RSS 조회", () => {
  it("본문을 가져오며 목록 조회 이후 숨기거나 삭제한 공고를 제외한다", async () => {
    const fetchMock = vi.fn().mockImplementation((url: URL) => {
      if (url.pathname.endsWith("/shows")) return Promise.resolve(json({ shows: [{ id: "show-1" }, { id: "show-deleted" }] }));
      if (url.pathname.endsWith("/show-1")) return Promise.resolve(json({
        id: "show-1", title: "공연", genre: "MUSIC", hostName: "극단", venue: { name: "공연장", roadAddress: "서울" },
        description: "공연 소개 전체\n두 번째 문단", guides: [], sessions: [{ startsAt: "2026-10-24T19:00:00+09:00" }],
      }));
      if (url.pathname.endsWith("/audition-posts")) return Promise.resolve(json({ posts: [{ id: 1 }, { id: 2 }, { id: 3 }] }));
      if (url.pathname.endsWith("/1")) return Promise.resolve(json({
        id: 1, title: "모집", category: "연극", bodyHtml: "<p>전체 본문</p>", deadlineText: "상시", attachments: [],
      }));
      if (url.pathname.endsWith("/2")) return Promise.resolve(new Response(null, { status: 302, headers: { Location: "https://otr.example.com/post/2" } }));
      return Promise.resolve(json({}, 404));
    });
    vi.stubGlobal("fetch", fetchMock);
    const items = await publicFeedItems();
    expect(items.map((item) => item.url)).toEqual(["https://yesulin.art/posts/1", "https://yesulin.art/shows/show-1"]);
    expect(items[0].bodyHtml).toContain("<p>전체 본문</p>");
    expect(items[1].bodyHtml).toContain("공연 소개 전체<br>두 번째 문단");
    expect(items[1].publishedAt).toBeUndefined();
    const request = fetchMock.mock.calls[0][0] as URL;
    expect(request.searchParams.get("includeClosed")).toBe("true");
    expect(request.searchParams.get("size")).toBe("48");
    expect(fetchMock.mock.calls.every(([, init]) => !init.method || init.method === "GET")).toBe(true);
  });

  it("API 장애 시 빈 정상 피드 대신 캐시하지 않는 503을 반환한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({}, 503)));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await GET();
    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});

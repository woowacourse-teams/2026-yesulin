import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/features/audition-posts/server", () => ({ auditionPostIdsForSitemap: async () => [] }));
vi.mock("@/features/shows/server", () => ({ publicShowsForServer: async () => [] }));

import sitemap from "@/app/sitemap";
import { actorHandlesForSitemap, actorPageForServer } from "./server";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" },
});

const list = (handles: readonly string[], page: number, totalPages: number) => ({
  actorPages: handles.map((handle) => ({ handle })),
  page,
  size: 48,
  totalPages,
  totalElements: handles.length,
});

beforeEach(() => {
  vi.stubEnv("API_ORIGIN", "https://api.example.com");
  vi.stubEnv("NEXT_PUBLIC_API_MOCKING", "");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("배우 페이지 서버 조회와 사이트맵", () => {
  it("공개 배우 목록을 48개씩 모든 페이지에서 읽어 사이트맵에 넣는다", async () => {
    const fetchMock = vi.fn().mockImplementation((url: URL) => {
      const page = Number(url.searchParams.get("page"));
      return Promise.resolve(json(list(page === 0 ? ["min.zzun_"] : ["actor2"], page, 2)));
    });
    vi.stubGlobal("fetch", fetchMock);

    const urls = (await sitemap()).map((entry) => entry.url);

    expect(urls).toContain("https://yesulin.art/actors");
    expect(urls).toContain("https://yesulin.art/@min.zzun_");
    expect(urls).toContain("https://yesulin.art/@actor2");
    expect(fetchMock.mock.calls.map(([url]) => (url as URL).search)).toEqual([
      "?page=0&size=48&sort=recent", "?page=1&size=48&sort=recent",
    ]);
  });

  it("목록 조회가 실패하면 일부만 담은 사이트맵을 만들지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({}, 503)));

    await expect(actorHandlesForSitemap()).rejects.toThrow("503");
  });

  it("목 환경에서는 서버에서 읽지 않는다", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_MOCKING", "enabled");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(actorHandlesForSitemap()).resolves.toEqual([]);
    await expect(actorPageForServer("min.zzun_")).resolves.toEqual({ kind: "client-only" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("404만 찾을 수 없음으로 보고 다른 실패는 오류로 둔다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({}, 404)));
    await expect(actorPageForServer("nobody")).resolves.toEqual({ kind: "missing" });

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({}, 503)));
    await expect(actorPageForServer("broken")).rejects.toThrow("503");
  });
});

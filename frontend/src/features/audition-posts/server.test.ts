import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import sitemap from "@/app/sitemap";
import { auditionPostForServer, auditionPostIdsForSitemap, auditionPostPageForServer, recordAuditionPostRedirect } from "./server";
import { auditionPostApiPaths } from "./types";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { "Content-Type": "application/json" },
});
const page = (ids: readonly number[], index = 0, totalPages = 1) => ({
  posts: ids.map((id) => ({ id, closed: true })), page: index, size: 48, totalPages,
  totalElements: ids.length, openCount: 0, allCount: ids.length,
});

beforeEach(() => {
  vi.stubEnv("API_ORIGIN", "https://api.example.com");
  vi.stubEnv("NEXT_PUBLIC_API_MOCKING", "");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("공개 공고 서버 조회", () => {
  it("정상 공고를 메타데이터와 본문용으로 반환한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ id: 123, title: "공개 공고" })));
    await expect(auditionPostForServer("123")).resolves.toEqual({
      kind: "published", post: { id: 123, title: "공개 공고" },
    });
  });

  it("실제 404만 missing으로 처리한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({}, 404)));
    await expect(auditionPostForServer("123")).resolves.toEqual({ kind: "missing" });
  });

  it("숨김 공고의 이동은 따라가지 않고 HTTPS 원문 주소를 반환한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, {
      status: 302, headers: { Location: "https://otr.example.com/posts/123" },
    }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(auditionPostForServer("123")).resolves.toEqual({
      kind: "hidden", originalUrl: "https://otr.example.com/posts/123",
    });
    expect(fetchMock).toHaveBeenCalledWith(expect.any(URL), expect.objectContaining({
      redirect: "manual", signal: expect.any(AbortSignal),
    }));
  });

  it.each([undefined, "http://otr.example.com/posts/123", "javascript:alert(1)"])(
    "숨김 공고의 올바르지 않은 원문 주소 %s를 오류로 처리한다", async (location) => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, {
        status: 302, headers: location ? { Location: location } : {},
      })));
      await expect(auditionPostForServer("123")).rejects.toThrow("원문 주소");
    },
  );

  it("일시적인 상세 서버 오류를 missing으로 바꾸지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({}, 503)));
    await expect(auditionPostForServer("123")).rejects.toThrow("503");
  });

  it("네트워크 오류를 전파하고 메인 목록의 브라우저 재시도는 유지한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    await expect(auditionPostForServer("123")).rejects.toThrow("fetch failed");
    await expect(auditionPostPageForServer({ page: 0, includeClosed: false })).resolves.toBeNull();
  });

  it("잘못된 상세 JSON도 오류로 전파한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("invalid json")));
    await expect(auditionPostForServer("123")).rejects.toThrow();
  });

  it.each(["mock", "unconfigured"])("%s 환경에서만 상세를 브라우저 조회로 넘긴다", async (mode) => {
    if (mode === "mock") vi.stubEnv("NEXT_PUBLIC_API_MOCKING", "enabled");
    else vi.stubEnv("API_ORIGIN", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await expect(auditionPostForServer("123")).resolves.toEqual({ kind: "client-only" });
    await expect(auditionPostIdsForSitemap()).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("공개 공고 사이트맵", () => {
  it("마감된 공개 공고도 48건씩 모든 페이지에서 읽고 중복 주소를 제거한다", async () => {
    const fetchMock = vi.fn().mockImplementation((url: URL) => {
      if (url.pathname.endsWith("/shows")) return Promise.resolve(json({ shows: [{ id: "show-1" }] }));
      const index = Number(url.searchParams.get("page"));
      return Promise.resolve(json(page(index === 0 ? [123, 124] : [124, 125], index, 2)));
    });
    vi.stubGlobal("fetch", fetchMock);
    const entries = await sitemap();
    expect(entries.map((entry) => entry.url)).toEqual([
      "https://yesulin.art/", "https://yesulin.art/producer-service", "https://yesulin.art/shows",
      "https://yesulin.art/shows/show-1", "https://yesulin.art/posts/123",
      "https://yesulin.art/posts/124", "https://yesulin.art/posts/125",
    ]);
    const requests = fetchMock.mock.calls.map(([url]) => url as URL)
      .filter((url) => url.pathname.endsWith("/audition-posts"));
    expect(requests.map((url) => url.search)).toEqual([
      "?page=0&size=48&includeClosed=true", "?page=1&size=48&includeClosed=true",
    ]);
  });

  it("공개 공고가 없으면 공고 주소를 추가하지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(page([], 0, 0))));
    await expect(auditionPostIdsForSitemap()).resolves.toEqual([]);
  });

  it.each([0, 1])("%i 페이지 조회 실패 시 일부 URL만 담은 사이트맵을 반환하지 않는다", async (failedPage) => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation((url: URL) => {
      if (url.pathname.endsWith("/shows")) return Promise.resolve(json({ shows: [] }));
      const index = Number(url.searchParams.get("page"));
      return Promise.resolve(index === failedPage ? json({}, 503) : json(page([123], index, 2)));
    }));
    await expect(sitemap()).rejects.toThrow("503");
  });
});

describe("공고 원문 이동 수 기록", () => {
  it("이동 수 경로로 제한 시간 신호와 함께 POST를 보낸다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await recordAuditionPostRedirect("123");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      new URL(`/api${auditionPostApiPaths.redirect("123")}`, "https://api.example.com"),
      expect.objectContaining({ method: "POST", signal: expect.any(AbortSignal) }),
    );
  });

  it("기록 요청이 제한 시간을 넘겨도 예외를 전파하지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new DOMException("timeout", "TimeoutError")));

    await expect(recordAuditionPostRedirect("123")).resolves.toBeUndefined();
  });
});

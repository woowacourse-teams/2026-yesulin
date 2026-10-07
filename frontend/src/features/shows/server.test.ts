import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import sitemap from "@/app/sitemap";
import { publicShowForServer, publicShowsForServer } from "./server";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "Content-Type": "application/json" },
});

beforeEach(() => {
  vi.stubEnv("API_ORIGIN", "https://api.example.com");
  vi.stubEnv("NEXT_PUBLIC_API_MOCKING", "");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("공개 공연 서버 조회와 사이트맵", () => {
  it("공개 목록의 공연 주소를 인코딩해서 사이트맵에 포함한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({ shows: [{ id: "show/1" }] })));

    const entries = await sitemap();

    expect(entries.map((entry) => entry.url)).toEqual([
      "https://yesulin.art/",
      "https://yesulin.art/producer-service",
      "https://yesulin.art/shows",
      "https://yesulin.art/shows/show%2F1",
    ]);
  });

  it("정상 빈 목록에서도 공연 목록 주소는 유지한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockImplementation(() => Promise.resolve(json({ shows: [] }))));

    await expect(publicShowsForServer()).resolves.toEqual([]);
    expect((await sitemap()).map((entry) => entry.url)).toContain("https://yesulin.art/shows");
  });

  it("목 환경에서는 서버 요청 없이 브라우저 조회를 허용한다", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_MOCKING", "enabled");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(publicShowsForServer()).resolves.toBeNull();
    await expect(publicShowForServer("seed_show")).resolves.toEqual({ status: "client-only" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("실제 상세 404만 missing으로 처리한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({}, 404)));

    await expect(publicShowForServer("missing")).resolves.toEqual({ status: "missing" });
  });

  it("상세 서버 오류는 missing 대신 오류로 전파한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({}, 503)));

    await expect(publicShowForServer("temporary-error")).rejects.toThrow("503");
  });

  it("네트워크 오류는 missing 대신 오류로 전파한다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));

    await expect(publicShowForServer("network-error")).rejects.toThrow("fetch failed");
  });

  it("목록 조회 실패를 빈 사이트맵으로 반환하지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json({}, 503)));

    await expect(sitemap()).rejects.toThrow("503");
  });
});

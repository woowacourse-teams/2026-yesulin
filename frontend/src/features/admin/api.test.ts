import { afterEach, describe, expect, it, vi } from "vitest";
import { deleteUnusedFiles, fetchAuditLogs, fetchLogs, fetchOtrRedirects, fetchShows, fetchUnusedFiles, normalizeAdminLog } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("admin API", () => {
  it("공고 이동 집계는 같은 환경의 관리자 API에 기간과 세션을 전달한다", async () => {
    const report = { environment: "PROD", totalClicks: 50, links: [], available: true, truncated: false };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(report));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchOtrRedirects(7)).resolves.toEqual(report);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/admin/otr-redirects?days=7", { method: "GET", credentials: "include" },
    );
  });

  it("공고 이동 조회 실패를 0건으로 바꾸지 않는다", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ message: "로그 조회 실패" }, { status: 500 })));
    await expect(fetchOtrRedirects()).rejects.toThrow("로그 조회 실패");
  });
  it("구조화 entries가 없는 구버전 응답을 LEGACY 항목으로 정규화한다", () => {
    const result = normalizeAdminLog({
      lines: ["INFO legacy application log"],
      truncated: false,
      available: true,
      readAt: "2026-08-31T05:00:00Z",
    });

    expect(result.entries).toEqual([{
      format: "LEGACY",
      timestamp: null,
      level: null,
      logger: null,
      thread: null,
      requestId: null,
      message: "INFO legacy application log",
      attributes: {},
      raw: "INFO legacy application log",
    }]);
  });

  it("검색어와 조회 범위를 관리자 로그 API에 전달한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      lines: [],
      entries: [],
      truncated: false,
      available: true,
      readAt: "2026-08-31T05:00:00Z",
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchLogs("  INTERNAL_ERROR  ", 100);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/admin/logs?limit=100&keyword=INTERNAL_ERROR",
      { method: "GET", credentials: "include" },
    );
  });

  it("지난 날짜를 고르면 date를 함께 전달한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      lines: [],
      entries: [],
      truncated: false,
      available: true,
      readAt: "2026-08-31T05:00:00Z",
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchLogs("", 200, "2026-08-29");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/admin/logs?limit=200&date=2026-08-29",
      { method: "GET", credentials: "include" },
    );
  });

  it("운영자 변경 기록의 요청 페이지를 API에 전달한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      logs: [],
      page: 2,
      size: 10,
      totalElements: 22,
      totalPages: 3,
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchAuditLogs(2);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/admin/audit-logs?page=2",
      { method: "GET", credentials: "include" },
    );
  });

  it("미사용 파일 상태와 페이지를 관리자 API에 전달한다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      files: [], page: 1, size: 25, hasNext: false,
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    await fetchUnusedFiles({ status: "READY", page: 1, size: 25 });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/admin/files/unreferenced?page=1&size=25&status=READY",
      { method: "GET", credentials: "include" },
    );
  });

  it("선택한 파일과 삭제 확인 비밀번호를 한 번에 전달하고 결과를 받는다", async () => {
    const results = { results: [{ fileId: 42, status: "DELETED", code: null }] };
    const fetchMock = vi.fn().mockResolvedValue(Response.json(results));
    vi.stubGlobal("fetch", fetchMock);

    await expect(deleteUnusedFiles([42, 43], "confirm-password")).resolves.toEqual(results);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/admin/files/deletions",
      expect.objectContaining({
        method: "POST",
        credentials: "include",
        body: JSON.stringify({ fileIds: [42, 43], confirmationPassword: "confirm-password" }),
      }),
    );
  });

  it("무료 공연 상태 필터를 전달하고 공연 목록만 돌려준다", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      shows: [{ showId: "show-1", title: "햄릿", sessions: [] }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const shows = await fetchShows("OPEN");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/v1/admin/shows?status=OPEN",
      { method: "GET", credentials: "include" },
    );
    expect(shows.map((show) => show.title)).toEqual(["햄릿"]);
  });
});

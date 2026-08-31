import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchAuditLogs, fetchLogs, normalizeAdminLog } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("admin log API", () => {
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
});

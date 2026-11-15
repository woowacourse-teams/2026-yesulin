import { afterEach, describe, expect, it, vi } from "vitest";
import { reportError } from "../monitoring/report-error";
import { isRequestId, REQUEST_ID_HEADER } from "../monitoring/request-id";
import {
  changeMemberStatus, deleteUnusedFiles, fetchAuditLogs, fetchLogs, fetchOpenChatVisits, fetchOtrRedirects,
  fetchShows, fetchUnusedFiles, normalizeAdminLog, resendMemberVerification,
} from "./api";

vi.mock("../monitoring/report-error", () => ({ reportError: vi.fn() }));

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe("admin API", () => {
  it("관리자 인증 메일 재전송은 대상 ID와 세션을 사용하고 60초 제한을 전달한다", async () => {
    vi.stubGlobal("document", { cookie: "XSRF-TOKEN=admin-csrf" });
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(Response.json({
        code: "AUTH_EMAIL_VERIFICATION_RESEND_TOO_SOON",
        message: "발급 후 60초가 지나면 다시 요청할 수 있습니다.",
      }, { status: 409 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(resendMemberVerification(11)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/admin/members/11/email-verifications", {
      method: "POST",
      credentials: "include",
      headers: { "X-CSRF-Token": "admin-csrf", [REQUEST_ID_HEADER]: expect.any(String) },
    });
    await expect(resendMemberVerification(11)).rejects.toMatchObject({
      status: 409, code: "AUTH_EMAIL_VERIFICATION_RESEND_TOO_SOON",
    });
    const requestIds = fetchMock.mock.calls.map(([, init]) => init.headers[REQUEST_ID_HEADER]);
    expect(requestIds.every(isRequestId)).toBe(true);
    expect(new Set(requestIds).size).toBe(2);
    expect(reportError).not.toHaveBeenCalled();
  });

  describe.each([
    { operation: "resend_member_verification", perform: () => resendMemberVerification(11) },
    { operation: "change_member_status", perform: () => changeMemberStatus(11, "ACTIVE") },
  ])("$operation 모니터링", ({ operation, perform }) => {
    it("네트워크 실패를 같은 요청 ID로 한 번 수집하고 원래 오류를 화면에 전달한다", async () => {
      vi.stubGlobal("document", { cookie: "XSRF-TOKEN=admin-csrf" });
      const failure = new TypeError("Network failure for demo@example.com");
      const fetchMock = vi.fn().mockRejectedValue(failure);
      vi.stubGlobal("fetch", fetchMock);

      await expect(perform()).rejects.toBe(failure);

      const requestId = fetchMock.mock.calls[0][1].headers[REQUEST_ID_HEADER];
      expect(isRequestId(requestId)).toBe(true);
      expect(reportError).toHaveBeenCalledExactlyOnceWith(
        new Error("Admin member request network failure"), { feature: "admin", operation, requestId },
      );
      expect(vi.mocked(reportError).mock.calls[0][0]).not.toHaveProperty("cause");
    });

    it("5xx의 상태와 요청 ID를 수집하고 응답 원문은 화면으로만 전달한다", async () => {
      vi.stubGlobal("document", { cookie: "XSRF-TOKEN=admin-csrf" });
      const message = "demo@example.com OTP 123456";
      const fetchMock = vi.fn().mockResolvedValue(Response.json({ message }, { status: 502 }));
      vi.stubGlobal("fetch", fetchMock);

      await expect(perform()).rejects.toMatchObject({ status: 502, message });

      const requestId = fetchMock.mock.calls[0][1].headers[REQUEST_ID_HEADER];
      expect(isRequestId(requestId)).toBe(true);
      expect(reportError).toHaveBeenCalledExactlyOnceWith(
        new Error("Admin member request server failure"),
        { feature: "admin", operation, requestId, status: 502 },
      );
      expect(vi.mocked(reportError).mock.calls[0][0]).not.toHaveProperty("cause");
    });

    it.each([401, 403, 409])("예상된 HTTP %i는 모니터링에 보내지 않는다", async (status) => {
      vi.stubGlobal("document", { cookie: "XSRF-TOKEN=admin-csrf" });
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ message: "요청 실패" }, { status })));

      await expect(perform()).rejects.toMatchObject({ status, message: "요청 실패" });
      expect(reportError).not.toHaveBeenCalled();
    });
  });

  it("중단된 재전송은 네트워크 장애로 수집하지 않는다", async () => {
    vi.stubGlobal("document", { cookie: "XSRF-TOKEN=admin-csrf" });
    const failure = new DOMException("aborted", "AbortError");
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(failure));

    await expect(resendMemberVerification(11)).rejects.toBe(failure);
    expect(reportError).not.toHaveBeenCalled();
  });

  it("오픈채팅 방문 순위는 게시일 범위와 페이지를 보내고 전체 기간은 날짜를 생략한다", async () => {
    const report = { posts: [], page: 1, size: 20, totalElements: 25, totalPages: 2, totalVisits: 9 };
    const fetchMock = vi.fn().mockImplementation(async () => Response.json(report));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchOpenChatVisits(1, { startDate: "2026-10-19", endDate: "2026-10-25" })).resolves.toEqual(report);
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/v1/admin/openchat/visits?page=1&startDate=2026-10-19&endDate=2026-10-25",
      { method: "GET", credentials: "include" },
    );
    await fetchOpenChatVisits();
    expect(fetchMock).toHaveBeenLastCalledWith(
      "/api/v1/admin/openchat/visits?page=0", { method: "GET", credentials: "include" },
    );
  });

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

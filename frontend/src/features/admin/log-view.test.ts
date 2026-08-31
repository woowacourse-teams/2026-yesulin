import { describe, expect, it } from "vitest";
import type { AdminLogEntry } from "./types";
import {
  filterLogEntries,
  isSlowHttpRequest,
  logElapsedMs,
  logEvent,
  logSummary,
  shortRequestId,
} from "./log-view";

function entry(overrides: Partial<AdminLogEntry> = {}): AdminLogEntry {
  return {
    format: "STRUCTURED",
    timestamp: "2026-08-31T05:02:24.700Z",
    level: "INFO",
    logger: "RequestLoggingFilter",
    thread: "http-nio-exec-1",
    requestId: "12345678-abcd-efgh-ijkl-123456789012",
    message: "HTTP request completed",
    attributes: {
      event: "HTTP_REQUEST",
      method: "GET",
      endpoint: "/api/v1/auditions/{auditionId}",
      status: 200,
      elapsedMs: 14,
    },
    raw: "structured raw log",
    ...overrides,
  };
}

describe("admin log presentation", () => {
  it("HTTP 구조화 필드로 읽기 쉬운 요약을 만든다", () => {
    const log = entry();

    expect(logEvent(log)).toBe("HTTP_REQUEST");
    expect(logSummary(log)).toBe("GET /api/v1/auditions/{auditionId} → 200");
    expect(logElapsedMs(log)).toBe(14);
    expect(shortRequestId(log.requestId)).toBe("12345678…");
  });

  it("1000ms부터 느린 HTTP 요청으로 분류한다", () => {
    expect(isSlowHttpRequest(entry({ attributes: { event: "HTTP_REQUEST", elapsedMs: 999 } }))).toBe(false);
    expect(isSlowHttpRequest(entry({ attributes: { event: "HTTP_REQUEST", elapsedMs: 1000 } }))).toBe(true);
    expect(isSlowHttpRequest(entry({ attributes: { event: "SLOW_SERVICE", elapsedMs: 1000 } }))).toBe(false);
  });

  it("ERROR, 느린 요청, requestId, 키워드 조건을 함께 적용한다", () => {
    const target = entry({
      level: "ERROR",
      requestId: "incident-12345678",
      attributes: { event: "HTTP_REQUEST", endpoint: "/api/v1/files", status: 500, elapsedMs: 1200 },
      raw: "file upload failed",
    });
    const other = entry({ requestId: "other-request", raw: "health check" });

    const result = filterLogEntries([other, target], {
      errorsOnly: true,
      slowRequestsOnly: true,
      requestId: "12345678",
      keyword: "upload",
    });

    expect(result).toEqual([target]);
  });

  it("기존 문자열은 내용을 해석하거나 실행하지 않고 LEGACY 요약으로 유지한다", () => {
    const raw = "<script>alert('unsafe')</script> legacy line";
    const legacy = entry({
      format: "LEGACY",
      timestamp: null,
      level: null,
      requestId: null,
      message: raw,
      attributes: {},
      raw,
    });

    expect(logEvent(legacy)).toBe("LEGACY");
    expect(logSummary(legacy)).toBe(raw);
  });
});

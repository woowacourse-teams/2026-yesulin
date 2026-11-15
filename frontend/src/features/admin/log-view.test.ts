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

  it.each([
    ["5.1.1", "받는 주소가 존재하지 않음"],
    ["5.7.1", "메일 정책 또는 전달 권한 문제로 거절됨"],
  ])("인증 메일의 SMTP 상세 코드 %s를 목록 요약에서 설명한다", (code, reason) => {
    const log = entry({
      message: "INITIAL_VERIFICATION_FAILED",
      attributes: {
        event: "UNEXPECTED_SERVICE_ERROR",
        mailFailureReason: "SMTP_RECIPIENT_REJECTED",
        smtpStatus: 550,
        smtpEnhancedStatus: code,
      },
    });

    expect(logSummary(log)).toBe(`INITIAL_VERIFICATION_FAILED · ${reason} (SMTP 550 ${code})`);
  });

  it.each([
    [undefined, "550"],
    ["5.8.123", "550 5.8.123"],
    ["5.1.1@private.example", "550"],
    ["4.7.1", "550"],
  ])("알 수 없거나 유효하지 않은 상세 코드 %s는 확인된 범위만 표시한다", (code, status) => {
    const log = entry({
      message: "VERIFICATION_RESEND_FAILED",
      attributes: { mailFailureReason: "SMTP_RECIPIENT_REJECTED", smtpStatus: 550, smtpEnhancedStatus: code },
    });

    expect(logSummary(log)).toBe(`VERIFICATION_RESEND_FAILED · 메일 서버가 받는 주소를 거절함 (SMTP ${status})`);
  });

  it("선택한 로그 레벨, 느린 요청, requestId, 키워드, 조건을 함께 적용한다", () => {
    const target = entry({
      level: "ERROR",
      requestId: "incident-12345678",
      attributes: { event: "HTTP_REQUEST", endpoint: "/api/v1/files", status: 500, elapsedMs: 1200 },
      raw: "file upload failed",
    });
    const other = entry({ requestId: "other-request", raw: "health check" });
    const matchingInfo = entry({
      level: "INFO",
      requestId: "incident-12345678",
      attributes: { event: "HTTP_REQUEST", endpoint: "/api/v1/files", status: 500, elapsedMs: 1200 },
      raw: "file upload failed",
    });

    const result = filterLogEntries([other, matchingInfo, target], {
      levels: ["ERROR"],
      slowRequestsOnly: true,
      requestId: "12345678",
      keyword: "upload",
    });

    expect(result).toEqual([target]);
  });

  it("레벨을 선택하지 않으면 모든 레벨과 기존 문자열 로그를 유지한다", () => {
    const legacy = entry({ format: "LEGACY", level: null });
    const warning = entry({ level: "WARN" });

    const result = filterLogEntries([legacy, warning], {
      levels: [],
      slowRequestsOnly: false,
      requestId: "",
      keyword: "",
    });

    expect(result).toEqual([legacy, warning]);
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

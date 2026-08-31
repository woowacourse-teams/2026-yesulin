import { delay, http, HttpResponse } from "msw";
import type { AdminLogEntry } from "@/features/admin/types";

const entries: readonly AdminLogEntry[] = [
  {
    format: "LEGACY",
    timestamp: "2026-08-31T04:57:46.639Z",
    level: "INFO",
    logger: "art.yesulin.LegacyLogger",
    thread: "http-nio-exec-2",
    requestId: "legacy-request-2026",
    message: "HTTP method=GET uri=/api/v1/sessions/current status=200 elapsedMs=14",
    attributes: {},
    raw: "2026-08-31 13:57:46.639 [http-nio-exec-2] INFO art.yesulin.LegacyLogger "
      + "[requestId=legacy-request-2026] HTTP method=GET uri=/api/v1/sessions/current status=200 elapsedMs=14",
  },
  {
    format: "STRUCTURED",
    timestamp: "2026-08-31T05:01:12.120Z",
    level: "INFO",
    logger: "art.yesulin.presentation.config.RequestLoggingFilter",
    thread: "http-nio-exec-4",
    requestId: "4ddcae2a-14d4-4cd2-9225-64a993edf9a2",
    message: "HTTP method=POST uri=/api/v1/auditions endpoint=/api/v1/auditions status=201 elapsedMs=86",
    attributes: {
      event: "HTTP_REQUEST",
      method: "POST",
      uri: "/api/v1/auditions",
      endpoint: "/api/v1/auditions",
      status: 201,
      elapsedMs: 86,
    },
    raw: "{\"level\":\"INFO\",\"event\":\"HTTP_REQUEST\",\"method\":\"POST\","
      + "\"endpoint\":\"/api/v1/auditions\",\"status\":201,\"elapsedMs\":86}",
  },
  {
    format: "STRUCTURED",
    timestamp: "2026-08-31T05:02:24.700Z",
    level: "WARN",
    logger: "art.yesulin.presentation.config.RequestLoggingFilter",
    thread: "http-nio-exec-7",
    requestId: "b8146918-c483-48d9-beba-666045794a08",
    message: "HTTP method=GET uri=/api/v1/admin/overview endpoint=/api/v1/admin/overview status=200 elapsedMs=1240",
    attributes: {
      event: "HTTP_REQUEST",
      method: "GET",
      uri: "/api/v1/admin/overview",
      endpoint: "/api/v1/admin/overview",
      status: 200,
      elapsedMs: 1240,
    },
    raw: "{\"level\":\"WARN\",\"event\":\"HTTP_REQUEST\",\"method\":\"GET\","
      + "\"endpoint\":\"/api/v1/admin/overview\",\"status\":200,\"elapsedMs\":1240}",
  },
  {
    format: "STRUCTURED",
    timestamp: "2026-08-31T05:03:31.450Z",
    level: "ERROR",
    logger: "art.yesulin.presentation.config.RequestLoggingFilter",
    thread: "http-nio-exec-9",
    requestId: "e4cc3722-a293-4ae6-b78a-7f8aa6405046",
    message: "예상하지 못한 요청 처리 오류가 발생했습니다.",
    attributes: {
      event: "UNEXPECTED_ERROR",
      method: "POST",
      uri: "/api/v1/submissions",
      endpoint: "/api/v1/submissions",
      errorCode: "INTERNAL_ERROR",
      exception: "IllegalStateException",
      stack_trace: "java.lang.IllegalStateException: upload state mismatch\n\tat art.yesulin.application.SubmissionService.submit(SubmissionService.java:42)",
    },
    raw: "{\"level\":\"ERROR\",\"event\":\"UNEXPECTED_ERROR\",\"errorCode\":\"INTERNAL_ERROR\"}",
  },
];

export const adminLogHandlers = [
  http.get("/api/v1/admin/logs", async ({ request }) => {
    await delay(120);
    const params = new URL(request.url).searchParams;
    const requestedLimit = Number(params.get("limit") ?? 200);
    const limit = Number.isFinite(requestedLimit) ? Math.min(500, Math.max(1, requestedLimit)) : 200;
    const keyword = params.get("keyword")?.trim().toLowerCase() ?? "";
    const matched = keyword
      ? entries.filter((entry) => entry.raw.toLowerCase().includes(keyword))
      : entries;
    const recent = matched.slice(-limit);
    return HttpResponse.json({
      lines: recent.map((entry) => entry.raw),
      entries: recent,
      truncated: matched.length > recent.length,
      available: true,
      readAt: new Date().toISOString(),
    });
  }),
];

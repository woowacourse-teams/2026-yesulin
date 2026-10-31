import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as Sentry from "@sentry/nextjs";
import { reportEventPhotoDiagnostic } from "./photo-upload-diagnostics";

vi.mock("@sentry/nextjs", () => ({ captureEvent: vi.fn() }));
beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.unstubAllGlobals());

describe("명함 사진 진단", () => {
  it("파일 원문·이름·MIME 원문을 보내지 않고 허용된 분류와 숫자만 전송한다", () => {
    vi.stubGlobal("navigator", { userAgent: "Android private-device SamsungBrowser Chrome Safari" });
    reportEventPhotoDiagnostic({
      incidentId: "test-id", stage: "PREPARING", result: "FAILED", errorCode: "PHOTO_PROCESSING_FAILED",
      elapsedMs: 123.4, source: new File(["private photo content"], "private-person.HEIC", { type: "private-invalid-type" }),
    });
    expect(Sentry.captureEvent).toHaveBeenCalledWith({
      message: "Event photo failed", level: "error",
      fingerprint: ["event-photo", "PREPARING", "FAILED", "PHOTO_PROCESSING_FAILED"],
      tags: { feature: "event_photo", operation: "photo_workflow", request_id: "test-id", photo_stage: "PREPARING",
        photo_result: "FAILED", error_code: "PHOTO_PROCESSING_FAILED", photo_format: "HEIC",
        coarse_platform: "ANDROID", coarse_browser: "SAMSUNG" },
      contexts: { photo: { source_size_mb: 1, elapsed_ms: 123 } },
    });
    expect(JSON.stringify(vi.mocked(Sentry.captureEvent).mock.calls)).not.toContain("private");
  });

  it("Sentry 수집 오류는 사용자 작업을 실패시키지 않는다", () => {
    vi.mocked(Sentry.captureEvent).mockImplementation(() => { throw new Error("unavailable"); });
    expect(() => reportEventPhotoDiagnostic({
      incidentId: "test-id", stage: "UPLOADING", result: "SLOW", errorCode: "PHOTO_SLOW", elapsedMs: 15000,
      source: new File(["x"], "x.unknown"), outputBytes: 1000,
    })).not.toThrow();
  });
});

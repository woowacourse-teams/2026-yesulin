import { beforeEach, describe, expect, it, vi } from "vitest";

const sentry = vi.hoisted(() => ({
  captureException: vi.fn(),
  setTag: vi.fn(),
}));

vi.mock("@sentry/nextjs", () => ({
  captureException: sentry.captureException,
  withScope: (callback: (scope: { setTag: typeof sentry.setTag }) => void) => callback({ setTag: sentry.setTag }),
}));

import { reportError } from "./report-error";

describe("reportError", () => {
  beforeEach(() => vi.clearAllMocks());

  it("WebKit 업로드 오류의 진단 태그와 중첩된 request ID만 보낸다", () => {
    const webkitError = new DOMException("The object can not be found here.", "NotFoundError");
    const uploadError = Object.assign(new Error("사진 전송 실패", { cause: webkitError }), {
      incidentId: "11111111-1111-4111-8111-111111111111",
      code: "WEBKIT_FILE_NOT_FOUND",
      stage: "RETRY",
      flow: "APPLICATION_PHOTO",
      attempt: 2,
    });
    const handledError = new Error("사용자 메시지로 변환된 오류", { cause: uploadError });

    reportError(handledError, { feature: "application", operation: "photo_upload" });

    expect(sentry.setTag).toHaveBeenCalledWith("request_id", "11111111-1111-4111-8111-111111111111");
    expect(sentry.setTag).toHaveBeenCalledWith("error_code", "WEBKIT_FILE_NOT_FOUND");
    expect(sentry.setTag).toHaveBeenCalledWith("upload_stage", "RETRY");
    expect(sentry.setTag).toHaveBeenCalledWith("upload_flow", "APPLICATION_PHOTO");
    expect(sentry.setTag).toHaveBeenCalledWith("upload_attempt", "2");
    expect(sentry.setTag).toHaveBeenCalledWith("cause_name", "NotFoundError");
    expect(sentry.captureException).toHaveBeenCalledWith(handledError);
  });

  it("같은 오류를 여러 계층에서 보고해도 한 번만 수집한다", () => {
    const error = new Error("network failed");

    reportError(error, { feature: "api", operation: "request" });
    reportError(error, { feature: "application", operation: "submit" });

    expect(sentry.captureException).toHaveBeenCalledTimes(1);
  });
});

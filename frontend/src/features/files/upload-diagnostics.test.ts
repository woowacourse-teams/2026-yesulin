import { describe, expect, it } from "vitest";
import { buildUploadDiagnosticRequest } from "./upload-diagnostics";

const diagnostic = {
  incidentId: "11111111-1111-4111-8111-111111111111",
  uploadFlow: "PROFILE_PHOTO" as const,
  stage: "PUT" as const,
  attempt: 1 as const,
  result: "FAILED" as const,
  errorCode: "WEBKIT_FILE_NOT_FOUND" as const,
};

describe("buildUploadDiagnosticRequest", () => {
  it("iOS 카카오톡 WebView와 서비스 워커 제어 여부를 거친 값으로만 분류한다", () => {
    const request = buildUploadDiagnosticRequest(diagnostic, {
      userAgent: "Mozilla/5.0 (iPhone) AppleWebKit/605.1.15 KAKAOTALK 11.0",
      platform: "iPhone",
      maxTouchPoints: 5,
      serviceWorkerControlled: true,
    });

    expect(request).toEqual({
      uploadFlow: "PROFILE_PHOTO",
      stage: "PUT",
      attempt: 1,
      result: "FAILED",
      errorCode: "WEBKIT_FILE_NOT_FOUND",
      serviceWorkerControlled: true,
      coarsePlatform: "IOS",
      coarseBrowser: "KAKAO",
    });
    expect(JSON.stringify(request)).not.toContain("Mozilla");
    expect(request).not.toHaveProperty("incidentId");
    expect(request).not.toHaveProperty("filename");
    expect(request).not.toHaveProperty("uploadUrl");
  });

  it("iOS Chrome과 Android 네이버를 서로 구분한다", () => {
    expect(buildUploadDiagnosticRequest(diagnostic, {
      userAgent: "Mozilla/5.0 (iPhone) CriOS/140.0 Mobile/15E148 Safari/604.1",
      platform: "iPhone",
      maxTouchPoints: 5,
      serviceWorkerControlled: false,
    })).toMatchObject({ coarsePlatform: "IOS", coarseBrowser: "CHROME" });

    expect(buildUploadDiagnosticRequest(diagnostic, {
      userAgent: "Mozilla/5.0 (Linux; Android 16) NAVER(inapp)",
      platform: "Linux armv8l",
      maxTouchPoints: 5,
      serviceWorkerControlled: false,
    })).toMatchObject({ coarsePlatform: "ANDROID", coarseBrowser: "NAVER" });
  });
});

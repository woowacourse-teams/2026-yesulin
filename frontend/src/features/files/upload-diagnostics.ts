import { withCsrfHeaders } from "../csrf";
import type { UploadDiagnostic } from "./safe-upload";

type DiagnosticWithIncident = UploadDiagnostic & { readonly incidentId: string };

type RuntimeSnapshot = {
  readonly userAgent: string;
  readonly platform: string;
  readonly maxTouchPoints: number;
  readonly serviceWorkerControlled: boolean;
};

export type UploadDiagnosticRequest = UploadDiagnostic & {
  readonly serviceWorkerControlled: boolean;
  readonly coarsePlatform: "IOS" | "ANDROID" | "DESKTOP" | "OTHER";
  readonly coarseBrowser: "SAFARI" | "CHROME" | "KAKAO" | "NAVER" | "INSTAGRAM" | "OTHER";
};

export function reportUploadDiagnostic(diagnostic: DiagnosticWithIncident) {
  const request = buildUploadDiagnosticRequest(diagnostic, runtimeSnapshot());
  void sendUploadDiagnostic(request, diagnostic.incidentId).catch(() => {
    // 진단 전송 실패가 사용자의 원래 업로드 결과를 덮어쓰지 않는 최상위 관측 경계다.
    console.warn(`[upload diagnostic unavailable] incidentId=${diagnostic.incidentId}`);
  });
}

export function buildUploadDiagnosticRequest(
  diagnostic: DiagnosticWithIncident,
  runtime: RuntimeSnapshot,
): UploadDiagnosticRequest {
  return {
    uploadFlow: diagnostic.uploadFlow,
    stage: diagnostic.stage,
    attempt: diagnostic.attempt,
    result: diagnostic.result,
    errorCode: diagnostic.errorCode,
    ...(diagnostic.httpStatus === undefined ? {} : { httpStatus: diagnostic.httpStatus }),
    serviceWorkerControlled: runtime.serviceWorkerControlled,
    coarsePlatform: coarsePlatform(runtime),
    coarseBrowser: coarseBrowser(runtime.userAgent),
  };
}

async function sendUploadDiagnostic(request: UploadDiagnosticRequest, incidentId: string) {
  const headers = await withCsrfHeaders({ "Content-Type": "application/json", "X-Request-Id": incidentId });
  const response = await fetch("/api/v1/upload-diagnostics", {
    method: "POST",
    credentials: "include",
    headers,
    body: JSON.stringify(request),
  });
  if (!response.ok) throw new Error(`upload diagnostic rejected: ${response.status}`);
}

function runtimeSnapshot(): RuntimeSnapshot {
  if (typeof navigator === "undefined") {
    return { userAgent: "", platform: "", maxTouchPoints: 0, serviceWorkerControlled: false };
  }
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    serviceWorkerControlled: navigator.serviceWorker?.controller !== null && navigator.serviceWorker?.controller !== undefined,
  };
}

function coarsePlatform(runtime: RuntimeSnapshot): UploadDiagnosticRequest["coarsePlatform"] {
  if (/iPhone|iPad|iPod/i.test(runtime.userAgent)
    || (/Mac/i.test(runtime.platform) && runtime.maxTouchPoints > 1)) return "IOS";
  if (/Android/i.test(runtime.userAgent)) return "ANDROID";
  if (/Windows|Macintosh|Linux/i.test(runtime.userAgent)) return "DESKTOP";
  return "OTHER";
}

function coarseBrowser(userAgent: string): UploadDiagnosticRequest["coarseBrowser"] {
  if (/KAKAOTALK/i.test(userAgent)) return "KAKAO";
  if (/NAVER/i.test(userAgent)) return "NAVER";
  if (/Instagram/i.test(userAgent)) return "INSTAGRAM";
  if (/CriOS|Chrome/i.test(userAgent)) return "CHROME";
  if (/Safari/i.test(userAgent)) return "SAFARI";
  return "OTHER";
}

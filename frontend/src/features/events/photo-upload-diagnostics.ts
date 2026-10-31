import * as Sentry from "@sentry/nextjs";

export type EventPhotoStage = "PREPARING" | "UPLOADING";
export type EventPhotoDiagnostic = {
  readonly incidentId: string;
  readonly stage: EventPhotoStage;
  readonly result: "SLOW" | "FAILED" | "TIMED_OUT";
  readonly errorCode: string;
  readonly elapsedMs: number;
  readonly source: File;
  readonly outputBytes?: number;
};

/** 원본 오류·파일·이름은 보내지 않고 정해진 분류와 숫자만 진단에 복사한다. */
export function reportEventPhotoDiagnostic(diagnostic: EventPhotoDiagnostic) {
  try {
    Sentry.captureEvent({
      message: `Event photo ${diagnostic.result.toLowerCase()}`,
      level: diagnostic.result === "SLOW" ? "warning" : "error",
      fingerprint: ["event-photo", diagnostic.stage, diagnostic.result, diagnostic.errorCode],
      tags: {
        feature: "event_photo",
        operation: "photo_workflow",
        request_id: diagnostic.incidentId,
        photo_stage: diagnostic.stage,
        photo_result: diagnostic.result,
        error_code: diagnostic.errorCode,
        photo_format: photoFormat(diagnostic.source),
        ...browserFamily(),
      },
      contexts: {
        photo: {
          source_size_mb: Math.ceil(diagnostic.source.size / 1024 / 1024),
          ...(diagnostic.outputBytes === undefined ? {} : { output_size_kb: Math.ceil(diagnostic.outputBytes / 1024) }),
          elapsed_ms: Math.max(0, Math.round(diagnostic.elapsedMs)),
        },
      },
    });
  } catch {
    // 진단 수집 실패가 사진 처리와 사용자 복구를 방해하지 않는다.
  }
}

function browserFamily() {
  const ua = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const coarsePlatform = /Android/i.test(ua) ? "ANDROID" : /iPhone|iPad|iPod/i.test(ua) ? "IOS"
    : /Windows|Macintosh|Linux/i.test(ua) ? "DESKTOP" : "OTHER";
  const coarseBrowser = /KAKAOTALK/i.test(ua) ? "KAKAO" : /NAVER/i.test(ua) ? "NAVER"
    : /Instagram/i.test(ua) ? "INSTAGRAM" : /SamsungBrowser/i.test(ua) ? "SAMSUNG"
      : /CriOS|Chrome/i.test(ua) ? "CHROME" : /Safari/i.test(ua) ? "SAFARI" : "OTHER";
  return { coarse_platform: coarsePlatform, coarse_browser: coarseBrowser };
}

function photoFormat(file: File) {
  const mime = file.type.toLowerCase().replace(/^image\//, "");
  const extension = file.name.split(".").at(-1)?.toLowerCase();
  const formats: Record<string, string> = {
    jpeg: "JPEG", jpg: "JPEG", png: "PNG", webp: "WEBP", heic: "HEIC", heif: "HEIF",
    avif: "AVIF", gif: "GIF", bmp: "BMP", tif: "TIFF", tiff: "TIFF",
  };
  return Object.hasOwn(formats, mime) ? formats[mime] : extension && Object.hasOwn(formats, extension) ? formats[extension] : "OTHER";
}

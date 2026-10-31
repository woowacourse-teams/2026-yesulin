import { PhotoProcessingError, shrinkPhoto } from "@/features/companies/photo-image";
import { SafeUploadError } from "@/features/files/safe-upload";
import { createRequestId } from "@/features/monitoring/request-id";
import { uploadEventRegistrationPhoto } from "./api";
import { reportEventPhotoDiagnostic, type EventPhotoStage } from "./photo-upload-diagnostics";

export const EVENT_PHOTO_SLOW_MS = 15_000;
export const EVENT_PHOTO_TIMEOUT_MS = { PREPARING: 60_000, UPLOADING: 120_000 } as const;

export type EventPhotoProgress = { readonly stage: EventPhotoStage; readonly slow: boolean };
export type EventPhotoTask = ReturnType<typeof startEventPhotoUpload>;

class PhotoTimeoutError extends Error {}

/** 시간 제한은 화면을 복구하고, signal은 요청 중단과 늦게 끝난 변환의 후속 작업 방지를 맡는다. */
export function startEventPhotoUpload(eventId: number, file: File, onProgress: (progress: EventPhotoProgress) => void) {
  const controller = new AbortController();
  const { signal } = controller;
  const incidentId = createRequestId();
  let stage: EventPhotoStage = "PREPARING";
  let startedAt = performance.now();
  let outputBytes: number | undefined;

  const report = (result: "SLOW" | "FAILED" | "TIMED_OUT", errorCode: string) => reportEventPhotoDiagnostic({
    incidentId, stage, result, errorCode, source: file, outputBytes, elapsedMs: performance.now() - startedAt,
  });

  async function runStage<T>(nextStage: EventPhotoStage, work: () => Promise<T>): Promise<T> {
    signal.throwIfAborted();
    stage = nextStage;
    startedAt = performance.now();
    onProgress({ stage, slow: false });
    const slow = setTimeout(() => {
      onProgress({ stage, slow: true });
      report("SLOW", "PHOTO_SLOW");
    }, EVENT_PHOTO_SLOW_MS);
    const timeout = setTimeout(() => controller.abort(new PhotoTimeoutError()), EVENT_PHOTO_TIMEOUT_MS[stage]);
    let aborted!: () => void;
    const cancellation = new Promise<never>((_, reject) => {
      aborted = () => reject(signal.reason);
      signal.addEventListener("abort", aborted, { once: true });
    });
    try {
      const result = await Promise.race([Promise.resolve().then(() => { signal.throwIfAborted(); return work(); }), cancellation]);
      signal.throwIfAborted();
      return result;
    } finally {
      clearTimeout(slow);
      clearTimeout(timeout);
      signal.removeEventListener("abort", aborted);
    }
  }

  // 다음 microtask에서 시작하여 호출자가 먼저 현재 작업 참조를 보관할 수 있게 한다.
  const result = Promise.resolve().then(async () => {
    try {
      const photo = await runStage("PREPARING", () => shrinkPhoto(file, signal));
      outputBytes = photo.size;
      const uploadKey = await runStage("UPLOADING", () => uploadEventRegistrationPhoto(eventId, photo, { signal, incidentId }));
      return { photo, uploadKey };
    } catch (cause) {
      const timedOut = signal.aborted && signal.reason instanceof PhotoTimeoutError;
      if (signal.aborted && !timedOut) throw signal.reason;
      report(timedOut ? "TIMED_OUT" : "FAILED", timedOut ? "PHOTO_TIMEOUT"
        : cause instanceof SafeUploadError || cause instanceof PhotoProcessingError ? cause.code : "PHOTO_PROCESSING_FAILED");
      const action = timedOut
        ? `사진 ${stage === "PREPARING" ? "준비" : "전송"} 시간이 초과됐어요. 사진을 다시 선택해 주세요.`
        : cause instanceof PhotoProcessingError ? cause.message
          : stage === "PREPARING" ? "사진을 준비하지 못했어요. JPG나 PNG 사진을 다시 선택해 주세요."
            : "사진을 전송하지 못했어요. 네트워크를 확인하고 사진을 다시 선택해 주세요.";
      throw new Error(`${action} 문의 시 오류 ID ${incidentId}를 알려 주세요.`);
    }
  });

  return { incidentId, result, cancel: () => controller.abort() };
}

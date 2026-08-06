import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);

let workerStartPromise: Promise<void> | null = null;

function isAlreadyEnabledError(error: unknown) {
  return String(error).includes("cannot configure an already enabled network");
}

/**
 * 인증 화면과 관리자 화면을 오갈 때 같은 브라우저 네트워크에 MSW를 중복
 * 설정하지 않도록 시작 Promise를 공유한다. 개발 중 HMR로 모듈이 다시
 * 평가된 경우에도 이미 활성화된 네트워크는 준비 완료로 취급한다.
 */
export function startMockWorker() {
  if (!workerStartPromise) {
    workerStartPromise = worker
      .start({ onUnhandledRequest: "bypass" })
      .then(() => undefined)
      .catch((error: unknown) => {
        if (isAlreadyEnabledError(error)) return;
        workerStartPromise = null;
        throw error;
      });
  }

  return workerStartPromise;
}

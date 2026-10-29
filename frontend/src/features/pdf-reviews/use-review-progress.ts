import { useCallback, useEffect, useRef, useState } from "react";
import { fetchPdfReviewProgress, isUnauthorized } from "./api";
import { sameKey, type ReviewKey, type ReviewProgress } from "./types";

const INTERVAL_MS = 3_000;
type Options = {
  readonly reviewId: ReviewKey | null;
  readonly uploading: boolean;
  readonly refreshKey: string;
  readonly onChanged: () => Promise<boolean>;
  readonly onUnauthorized: () => void;
};

/** A lightweight, serial poll. No PDF, S3 or model requests; terminal results stop the timer. */
export function useReviewProgress({ reviewId, uploading, refreshKey, onChanged, onUnauthorized }: Options) {
  const [result, setResult] = useState<{ reviewId: ReviewKey; progress: ReviewProgress } | null>(null);
  const [failure, setFailure] = useState<{ reviewId: ReviewKey; message: string } | null>(null);
  const callbacks = useRef({ onChanged, onUnauthorized });
  const last = useRef<{ reviewId: ReviewKey; signature: string } | null>(null);
  const checkNow = useRef<() => void>(() => {});
  useEffect(() => { callbacks.current = { onChanged, onUnauthorized }; });
  useEffect(() => {
    if (reviewId === null) return;
    const id = reviewId;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let running = false;
    let stopped = false;
    let unauthorized = false;
    const schedule = () => { if (!controller.signal.aborted && !stopped) timer = setTimeout(() => void check(), INTERVAL_MS); };
    async function check() {
      clearTimeout(timer);
      if (controller.signal.aborted || stopped || running || document.hidden) return;
      running = true;
      try {
        const progress = await fetchPdfReviewProgress(id, controller.signal);
        if (controller.signal.aborted) return;
        setResult({ reviewId: id, progress });
        setFailure(null);
        const signature = JSON.stringify(progress);
        if (!sameKey(last.current?.reviewId, id) || last.current?.signature !== signature) {
          // Mark a snapshot handled only after DB sync succeeds; failed sync retries on the next check.
          if (!await callbacks.current.onChanged()) throw new Error("처리 결과 목록을 갱신하지 못했습니다. 다시 확인하고 있습니다.");
          if (controller.signal.aborted) return;
          last.current = { reviewId: id, signature };
        }
        stopped = progress.complete && !uploading;
      } catch (cause) {
        if (controller.signal.aborted) return;
        setFailure({ reviewId: id, message: cause instanceof Error ? cause.message : "처리 진행률을 확인하지 못했습니다." });
        if (isUnauthorized(cause)) { unauthorized = true; stopped = true; callbacks.current.onUnauthorized(); }
      } finally {
        running = false;
        schedule();
      }
    }
    const onVisible = () => {
      if (unauthorized) return;
      if (document.hidden) clearTimeout(timer);
      else { stopped = false; void check(); }
    };
    const recheck = () => { if (!unauthorized) { stopped = false; void check(); } };
    checkNow.current = recheck;
    document.addEventListener("visibilitychange", onVisible);
    void check();
    return () => {
      controller.abort(); clearTimeout(timer); document.removeEventListener("visibilitychange", onVisible);
      if (checkNow.current === recheck) checkNow.current = () => {};
    };
  }, [reviewId, uploading, refreshKey]);

  return {
    progress: sameKey(result?.reviewId, reviewId) ? result!.progress : null,
    error: sameKey(failure?.reviewId, reviewId) ? failure!.message : "",
    recheck: useCallback(() => checkNow.current(), []),
  };
}

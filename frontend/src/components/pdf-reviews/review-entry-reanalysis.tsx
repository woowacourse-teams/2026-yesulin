"use client";

import { useEffect, useRef, useState } from "react";
import { SecondaryButton } from "@/components/ui/controls";
import { isUnauthorized, reanalyzePdfReviewEntry } from "@/features/pdf-reviews/api";
import type { ReviewEntry, ReviewKey } from "@/features/pdf-reviews/types";

type Props = {
  readonly reviewId: ReviewKey;
  readonly entryId: ReviewKey;
  readonly ready: boolean;
  readonly disabled: boolean;
  readonly onBusyChange: (busy: boolean) => void;
  readonly onSaved: (entry: ReviewEntry) => void;
  readonly onUnauthorized: () => void;
};

export function ReviewEntryReanalysis({ reviewId, entryId, ready, disabled, onBusyChange, onSaved, onUnauthorized }: Props) {
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const mounted = useRef(true);
  const inFlight = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);

  async function reanalyze() {
    if (!ready || disabled || inFlight.current) return;
    inFlight.current = true;
    onBusyChange(true);
    setRunning(true); setMessage(""); setError("");
    try {
      const updated = await reanalyzePdfReviewEntry(reviewId, entryId);
      if (!mounted.current) return;
      onSaved(updated);
      setMessage(updated.matchStatus === "MATCHED" ? "지원 배역을 연결했습니다." : "다시 확인했습니다. 지원서의 근거를 확인해 주세요.");
    } catch (cause) {
      if (!mounted.current) return;
      if (isUnauthorized(cause)) onUnauthorized();
      setError(cause instanceof Error ? cause.message : "지원 배역을 다시 확인하지 못했습니다.");
    } finally {
      inFlight.current = false;
      if (mounted.current) { setRunning(false); onBusyChange(false); }
    }
  }

  return <div className="mt-4 space-y-2">
    <SecondaryButton type="button" disabled={!ready || disabled || running} onClick={() => void reanalyze()}>
      {running ? "배역 확인 중…" : "배역 다시 확인"}
    </SecondaryButton>
    <p className="text-xs leading-5 text-muted-strong">{ready
      ? "저장된 추출 내용으로 다시 확인합니다. 메모와 심사 결정은 유지됩니다."
      : "PDF 추출이 완료되면 배역을 다시 확인할 수 있습니다."}</p>
    <p role="status" className="text-sm text-muted-strong">{message}</p>
    {error ? <p role="alert" className="break-words text-sm text-fail">{error}</p> : null}
  </div>;
}

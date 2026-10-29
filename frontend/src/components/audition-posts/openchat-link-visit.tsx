"use client";

import { useEffect } from "react";
import { rememberOpenchatEntry } from "@/features/analytics/product-analytics";
import { cleanOpenChatSource, recordOpenChatVisit, type OpenChatVisitTarget } from "@/features/audition-posts/openchat-visit";

/** 공개 상세에서는 주소만 정리하고, 원문 경유는 기록을 최대 1.5초 기다린 뒤 기존 이동 경로를 연다. */
export function OpenChatLinkVisit({ kind, id, dedupKey, destination }: OpenChatVisitTarget & {
  readonly destination?: string;
}) {
  useEffect(() => {
    rememberOpenchatEntry(kind, id);
    let active = true;
    let finished = false;
    const finish = () => {
      if (!active || finished) return;
      finished = true;
      if (destination) window.location.replace(destination);
      else cleanOpenChatSource(id);
    };
    const timer = window.setTimeout(finish, 1_500);
    // 방문 집계가 실패해도 공고 열람과 원문 이동은 계속한다.
    void recordOpenChatVisit({ kind, id, dedupKey }).catch(() => undefined).finally(finish);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [kind, id, dedupKey, destination]);

  if (!destination) return null;
  return (
    <main className="mx-auto max-w-lg px-5 py-16 text-center">
      <p role="status" className="text-sm text-muted-strong">공고를 여는 중이에요.</p>
      <a href={destination} className="mt-4 inline-flex min-h-11 items-center font-semibold text-brand underline underline-offset-4">공고 바로 열기</a>
    </main>
  );
}

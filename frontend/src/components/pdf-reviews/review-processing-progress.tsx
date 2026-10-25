"use client";

import { useState } from "react";
import type { ReviewProgress } from "@/features/pdf-reviews/types";

export function ReviewProcessingProgress({ progress, uploading, uploadMessage, error, onRetry }: {
  readonly progress: ReviewProgress | null; readonly uploading: boolean; readonly uploadMessage: string;
  readonly error: string; readonly onRetry: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState("");
  const finished = progress ? progress.completed + progress.partial + progress.failed : 0;
  const complete = !!progress?.complete && !uploading;
  const snapshot = JSON.stringify([progress, uploading, error]);
  if ((!progress?.total && !error && !uploading) || dismissed === snapshot) return null;
  const needsCheck = !!error || !!progress?.failed || !!progress?.partial;
  const title = error ? "진행 상황 확인 오류" : uploading ? "PDF 업로드 중" : complete ? "PDF 처리 완료" : "PDF 처리 중";
  return <section aria-label="PDF 처리 알림" data-pdf-processing-toast data-expanded={expanded} className="fixed bottom-[max(16px,env(safe-area-inset-bottom))] right-4 z-40 w-[calc(100vw-32px)] max-w-sm overflow-hidden rounded-card border border-border bg-card text-sm shadow-[var(--shadow-3)] sm:right-6">
      <div className="flex items-start gap-2 px-4 pt-3">
        <span aria-hidden="true" className={`mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full ${needsCheck ? "bg-fail-bg text-fail" : complete ? "bg-pass-bg text-pass" : "bg-brand-soft text-brand"}`}>{needsCheck ? "!" : complete ? "✓" : "↑"}</span>
        <div role="status" aria-live="polite" className="min-w-0 flex-1 py-1">
          <p className="font-semibold">{title}</p>
          {progress && <p className="num mt-1 text-xs text-muted-strong">{complete ? `완료 ${progress.completed}개 · 일부 완료 ${progress.partial}개 · 실패 ${progress.failed}개` : `${finished} / ${progress.total}개 처리 종료`}</p>}
        </div>
        {(complete || !!error) && <button type="button" onClick={() => setDismissed(snapshot)} aria-label="PDF 처리 알림 닫기" className="-mr-2 -mt-1 grid h-11 w-11 shrink-0 place-items-center rounded-control text-lg text-muted-strong hover:bg-surface">×</button>}
      </div>
      {!complete && !!progress?.total && <div className="px-4 pt-1"><progress aria-label="PDF 처리 진행률" max={progress.total} value={finished} className="h-1.5 w-full accent-brand" /></div>}
      <div className="flex items-center justify-between gap-2 px-4">
        <p className="text-xs text-muted-strong">{complete ? "업로드한 PDF의 처리가 끝났습니다." : "처리가 끝나면 알려드릴게요."}</p>
        <button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)} className="min-h-11 shrink-0 rounded-control px-2 text-xs font-semibold text-muted-strong hover:bg-surface">{expanded ? "접기" : "자세히"}</button>
      </div>
      {expanded && <div className="max-h-[min(40dvh,280px)] overflow-y-auto border-t border-border px-4 py-3 text-xs leading-6 text-muted-strong">
        {progress && <p>전체 {progress.total}개 · 업로드 중 {progress.uploading}개 · 대기/처리 중 {progress.waiting}개 · 완료 {progress.completed}개 · 일부 완료 {progress.partial}개 · 실패 {progress.failed}개</p>}
        {uploading && uploadMessage && <p>{uploadMessage}</p>}
        {complete && needsCheck && <p className="text-fail">일부 파일은 원본과 처리 상태를 확인해 주세요.</p>}
      </div>}
      {error && <div className="border-t border-border px-4 py-2"><p role="alert" className="text-xs text-fail">{error}</p><button type="button" onClick={onRetry} className="min-h-11 rounded-control px-2 text-xs font-semibold text-brand hover:bg-surface">다시 확인</button></div>}
    </section>;
}

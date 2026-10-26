"use client";

import { useState } from "react";
import type { ReviewProgress } from "@/features/pdf-reviews/types";
import { isUploadable, type UploadNotice, type UploadRow } from "@/features/pdf-reviews/use-review-uploads";

const phaseLabel = { SELECTED: "대기", UPLOADING: "업로드 중", UPLOADED: "업로드 완료", ERROR: "확인 필요" } as const;

export function ReviewProcessingProgress({ progress, uploading, uploadMessage, uploadError, error, onRetry, notices, rows, uploadBusy, disabled, onRemove, onClearUploaded, onRetryUpload }: {
  readonly progress: ReviewProgress | null; readonly uploading: boolean; readonly uploadMessage: string;
  readonly uploadError: string; readonly error: string; readonly onRetry: () => void;
  readonly notices: readonly UploadNotice[]; readonly rows: readonly UploadRow[];
  readonly uploadBusy: boolean; readonly disabled: boolean;
  readonly onRemove: (id: string) => void; readonly onClearUploaded: () => void; readonly onRetryUpload: (row: UploadRow) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [dismissed, setDismissed] = useState("");
  const retryRows = new Map(rows.map(row => [row.id, row]));
  const finished = progress ? progress.completed + progress.partial + progress.failed : 0;
  const complete = !!progress?.complete && !uploading;
  const snapshot = JSON.stringify([progress, uploading, uploadMessage, uploadError, error, notices.map(item => [item.id, item.phase])]);
  if ((!progress?.total && !error && !uploading && !notices.length && !uploadMessage && !uploadError) || dismissed === snapshot) return null;
  const uploadErrors = notices.filter(item => item.phase === "ERROR").length;
  const needsCheck = !!uploadError || !!error || !!progress?.failed || !!progress?.partial || uploadErrors > 0;
  const title = error ? "진행 상황 확인 오류" : uploading ? "PDF 업로드 중" : uploadErrors || uploadError ? "업로드 확인 필요" : complete ? "PDF 처리 완료" : progress?.total ? "PDF 처리 중" : "업로드 알림";
  return <section aria-label="PDF 처리 알림" data-pdf-processing-toast data-expanded={expanded} className="fixed bottom-[max(12px,env(safe-area-inset-bottom))] right-3 z-40 w-[calc(100vw-24px)] max-w-sm overflow-hidden rounded-card border border-border bg-card text-sm shadow-[var(--shadow-3)] sm:bottom-4 sm:right-6">
    <div className="flex items-center gap-2 px-3 py-2">
      <span aria-hidden="true" className={`grid h-7 w-7 shrink-0 place-items-center rounded-full ${needsCheck ? "bg-fail-bg text-fail" : complete ? "bg-pass-bg text-pass" : "bg-brand-soft text-brand"}`}>{needsCheck ? "!" : complete ? "✓" : "↑"}</span>
      <div role="status" aria-live="polite" className="min-w-0 flex-1">
        <p className="font-semibold">{title}</p>
        {uploadErrors && !uploading ? <p className="num mt-0.5 text-xs text-fail">업로드 확인이 필요한 파일 {uploadErrors}개</p> : progress?.total ? <p className="num mt-0.5 text-xs text-muted-strong">{complete ? `완료 ${progress.completed} · 일부 ${progress.partial} · 실패 ${progress.failed}` : `${finished} / ${progress.total}개 처리 종료`}</p> : null}
      </div>
      <button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)} className="min-h-11 shrink-0 rounded-control px-2 text-xs font-semibold text-muted-strong hover:bg-surface">{expanded ? "접기" : `내역${notices.length ? ` ${notices.length}` : ""}`}</button>
      <button type="button" onClick={() => setDismissed(snapshot)} aria-label="PDF 처리 알림 닫기" className="grid h-11 w-11 shrink-0 place-items-center rounded-control text-lg text-muted-strong hover:bg-surface">×</button>
    </div>
    {!complete && !!progress?.total && <div className="px-3 pb-2"><progress aria-label="PDF 처리 진행률" max={progress.total} value={finished} className="block h-1 w-full accent-brand" /></div>}
    {expanded && <div className="max-h-[min(45dvh,360px)] overflow-y-auto overscroll-contain border-t border-border px-3 pb-3 text-xs leading-5 text-muted-strong">
      {uploadMessage && <p className="break-words py-2">{uploadMessage}</p>}
      {progress && <p className="pb-2">전체 {progress.total} · 업로드 중 {progress.uploading} · 대기/처리 중 {progress.waiting} · 완료 {progress.completed} · 일부 {progress.partial} · 실패 {progress.failed}</p>}
      {!!notices.length && <>
        <div className="flex items-center justify-between border-t border-border py-1"><h3 className="font-semibold">업로드 내역</h3><button type="button" onClick={onClearUploaded} disabled={!notices.some(item => item.phase === "UPLOADED")} className="min-h-11 px-2 font-semibold text-muted-strong disabled:opacity-40">완료 내역 지우기</button></div>
        <ul aria-label="PDF 업로드 내역" className="divide-y divide-border-soft">{notices.map(item => {
          const row = retryRows.get(item.id);
          const retryable = row && item.phase === "ERROR" && isUploadable(row);
          return <li key={item.id} className="py-2">
            <div className="flex items-start gap-2"><div className="min-w-0 flex-1"><p className="break-all font-medium text-foreground">{item.name}</p><p className={`mt-1 ${item.phase === "ERROR" ? "text-fail" : "text-muted"}`}>{phaseLabel[item.phase]} · {(item.size / 1024 / 1024).toFixed(2)}MiB</p></div>
              {(item.phase === "UPLOADED" || item.phase === "ERROR") && <button type="button" disabled={uploadBusy} onClick={() => onRemove(item.id)} aria-label={`${item.name} 알림에서 지우기`} className="grid h-11 w-11 shrink-0 place-items-center rounded-control text-base hover:bg-surface disabled:opacity-40">×</button>}
            </div>
            {item.error && <p className="mt-1 break-words text-fail">{item.error}</p>}
            {retryable && <button type="button" disabled={uploadBusy || disabled} onClick={() => onRetryUpload(row)} className="min-h-11 px-2 font-semibold text-brand disabled:opacity-40">{row.file ? "업로드 다시 시도" : "업로드 완료 확인"}</button>}
          </li>;
        })}</ul>
        <p className="mt-2 text-muted">내역을 지워도 등록된 지원서와 심사 결과는 유지됩니다.</p>
      </>}
      {complete && needsCheck && <p className="mt-2 text-fail">일부 파일은 원본과 처리 상태를 확인해 주세요.</p>}
    </div>}
    {uploadError && <p role="alert" className="border-t border-border px-3 py-2 text-xs text-fail">{uploadError}</p>}
    {error && <div className="border-t border-border px-3 py-2"><p role="alert" className="text-xs text-fail">{error}</p><button type="button" onClick={onRetry} className="min-h-11 rounded-control px-2 text-xs font-semibold text-brand hover:bg-surface">다시 확인</button></div>}
  </section>;
}

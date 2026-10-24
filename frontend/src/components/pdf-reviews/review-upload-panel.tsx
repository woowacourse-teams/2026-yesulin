"use client";

import { useRef } from "react";
import { PrimaryButton, SecondaryButton, TextButton } from "@/components/ui/controls";
import { sameKey, type ReviewKey } from "@/features/pdf-reviews/types";
import { isUploadable, type UploadRow } from "@/features/pdf-reviews/use-review-uploads";

type Props = {
  readonly reviewId: ReviewKey;
  readonly rows: readonly UploadRow[];
  readonly busy: boolean;
  readonly message: string;
  readonly disabled: boolean;
  readonly onChoose: (files: FileList | null) => void;
  readonly onUploadAll: () => void;
  readonly onRetry: (row: UploadRow) => void;
  readonly onRemove: (id: string) => void;
};

const phaseText = (row: UploadRow) => row.phase === "SELECTED" ? "업로드 전" : row.phase === "UPLOADING" ? "업로드 중" : "업로드 확인 필요";

export function ReviewUploadPanel({ reviewId, rows, busy, message, disabled, onChoose, onUploadAll, onRetry, onRemove }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const mine = rows.filter(row => sameKey(row.reviewId, reviewId));
  const ready = mine.filter(isUploadable).length;
  return <section aria-label="지원서 PDF 올리기" className="rounded-card border border-border bg-card p-5">
    <div className="flex flex-wrap items-center gap-3">
      <label className={`inline-flex min-h-12 cursor-pointer items-center rounded-control border border-brand-line px-5 text-sm font-semibold text-brand focus-within:outline-2 focus-within:outline-brand ${busy || disabled ? "pointer-events-none opacity-50" : ""}`}>
        PDF 여러 개 선택
        <input ref={input} type="file" accept=".pdf,application/pdf" multiple disabled={busy || disabled} className="sr-only"
          onChange={event => { onChoose(event.target.files); if (input.current) input.current.value = ""; }} />
      </label>
      <PrimaryButton onClick={onUploadAll} disabled={!ready || busy || disabled} className="min-h-12 px-5">{busy ? "업로드 중…" : `선택한 ${ready}개 올리기`}</PrimaryButton>
      <p role="status" className="text-sm text-muted-strong">{message}</p>
    </div>
    <p className="mt-3 text-xs leading-6 text-muted">파일당 25MiB · 한 심사에 최대 800개 · 동시에 2개씩 올립니다. 한 파일이 실패해도 나머지는 계속 진행합니다. PDF 한 파일은 쪽 수와 관계없이 지원서 1개로 셉니다.</p>
    {mine.length ? <ul aria-label="올릴 파일" className="mt-4 max-h-64 space-y-2 overflow-y-auto">
      {mine.map(row => <li key={row.id} className="rounded-control border border-border p-3">
        <span className="block break-all text-sm font-semibold">{row.name}</span>
        <span className="num mt-1 block text-xs text-muted-strong">{(row.size / 1024 / 1024).toFixed(2)}MiB · {phaseText(row)}</span>
        {row.error ? <p role="alert" className="mt-2 break-words text-xs leading-6 text-fail">{row.error}</p> : null}
        <div className="mt-1 flex flex-wrap gap-1">
          {row.phase === "ERROR" && isUploadable(row) ? <SecondaryButton disabled={busy || disabled} onClick={() => onRetry(row)} aria-label={`${row.name} ${row.file ? "업로드 다시 시도" : "업로드 완료 확인"}`} className="text-xs">{row.file ? "업로드 다시 시도" : "업로드 완료 확인"}</SecondaryButton> : null}
          {row.phase !== "UPLOADING" ? <TextButton disabled={busy} onClick={() => onRemove(row.id)} aria-label={`${row.name} 목록에서 제외`} className="text-xs">목록에서 제외</TextButton> : null}
        </div>
      </li>)}
    </ul> : null}
  </section>;
}

"use client";

import { type RefObject, type ReactNode } from "react";
import { PrimaryButton, SecondaryButton, TextButton } from "@/components/ui/controls";
import { sameKey, type ReviewKey } from "@/features/pdf-reviews/types";
import { isUploadable, type UploadRow } from "@/features/pdf-reviews/use-review-uploads";

import styles from "./screening.module.css";

type Props = {
  readonly children?: ReactNode;
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly reviewId: ReviewKey;
  readonly rows: readonly UploadRow[];
  readonly busy: boolean;
  readonly message: string;
  readonly disabled: boolean;
  readonly onChoose: (files: FileList | readonly File[] | null) => void;
  readonly onUploadAll: () => void;
  readonly onRetry: (row: UploadRow) => void;
  readonly onRemove: (id: string) => void;
};

const phaseText = (row: UploadRow) => row.phase === "SELECTED" ? "업로드 전" : row.phase === "UPLOADING" ? "업로드 중" : "업로드 확인 필요";

export function ReviewUploadPanel({ reviewId, rows, busy, message, disabled, onChoose, onUploadAll, onRetry, onRemove, children, inputRef: input }: Props) {
  const mine = rows.filter(row => sameKey(row.reviewId, reviewId));
  const ready = mine.filter(isUploadable).length;
  return <section aria-label="지원서 PDF 올리기">
    <div className={styles.uploadToolbar}>
      {children}
      <button type="button" disabled={busy || disabled} className={`${styles.primary} ${styles.uploadAction}`} onClick={() => input.current?.click()}>
        <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" /></svg>PDF 추가
      </button>
      <input ref={input} type="file" accept=".pdf,application/pdf" multiple disabled={busy || disabled} className={styles.hidden} aria-label="지원자 PDF 선택" onChange={event => { onChoose(event.target.files); event.currentTarget.value = ""; }} />
    </div>
    {ready > 0 && !busy ? <PrimaryButton onClick={onUploadAll} disabled={disabled}>선택한 {ready}개 다시 올리기</PrimaryButton> : null}
    {message && <details className={styles.uploads}><summary>업로드 결과 · {message}</summary><p role="status">한 번에 300개 · 파일당 최대 25MiB. 준비된 지원자부터 심사할 수 있습니다.</p></details>}
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

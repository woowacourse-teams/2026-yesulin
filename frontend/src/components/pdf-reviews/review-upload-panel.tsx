"use client";

import { useState, type RefObject, type ReactNode } from "react";
import { folderPdfs } from "@/features/pdf-reviews/upload-selection";
import styles from "./screening.module.css";

type Props = {
  readonly children?: ReactNode;
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly folderInputRef: RefObject<HTMLInputElement | null>;
  readonly busy: boolean;
  readonly disabled: boolean;
  readonly onChoose: (files: FileList | readonly File[] | null) => void;
};

export function ReviewUploadPanel({ busy, disabled, onChoose, children, inputRef: input, folderInputRef: folderInput }: Props) {
  const [folderError, setFolderError] = useState("");
  return <><section aria-label="지원서 PDF 일괄 업로드" className={styles.uploadToolbar}>
    {children}
    <div className={styles.uploadButtons}>
    <button type="button" disabled={busy || disabled} className={styles.uploadAction} onClick={() => { setFolderError(""); folderInput.current?.click(); }}>폴더 선택</button>
    <button type="button" disabled={busy || disabled} className={`${styles.primary} ${styles.uploadAction}`} onClick={() => input.current?.click()}>
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" /></svg>{busy ? "파일 준비·업로드 중…" : "PDF 일괄 업로드"}
    </button>
    </div>
    <input ref={input} type="file" accept=".pdf,application/pdf" multiple disabled={busy || disabled} className={styles.hidden} aria-label="지원자 PDF 여러 개 선택" onChange={event => { setFolderError(""); onChoose(event.target.files); event.currentTarget.value = ""; }} />
    <input ref={folderInput} type="file" multiple {...{ webkitdirectory: "" }} disabled={busy || disabled} className={styles.hidden} aria-label="지원자 PDF 폴더 선택" onChange={event => {
      try { setFolderError(""); onChoose(folderPdfs(event.target.files ?? [])); }
      catch (cause) { setFolderError(cause instanceof Error ? cause.message : "폴더를 읽지 못했습니다."); }
      event.currentTarget.value = "";
    }} />
  </section>{folderError && <p role="alert" className="mb-2 text-sm text-fail">{folderError}</p>}</>;
}

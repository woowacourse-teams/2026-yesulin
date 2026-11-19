"use client";

import { useState, type RefObject } from "react";
import { folderPdfs } from "@/features/pdf-reviews/upload-selection";
import styles from "./screening.module.css";

type Props = {
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly folderInputRef: RefObject<HTMLInputElement | null>;
  readonly busy: boolean;
  readonly disabled: boolean;
  readonly onChoose: (files: FileList | readonly File[] | null) => void;
};

export function ReviewUploadPanel({ busy, disabled, onChoose, inputRef: input, folderInputRef: folderInput }: Props) {
  const [folderError, setFolderError] = useState("");
  return <><section aria-label="지원서 PDF 추가" className={styles.uploadButtons}>
    <button type="button" disabled={busy || disabled} className={styles.toolbarButton} onClick={() => { setFolderError(""); folderInput.current?.click(); }}>폴더 선택</button>
    <button type="button" disabled={busy || disabled} className={styles.toolbarButton} onClick={() => input.current?.click()}>
      {busy && <><span aria-hidden="true" className="inline-block h-[18px] w-[18px] shrink-0 animate-spin rounded-full border-2 border-current/30 border-t-current motion-reduce:animate-none" />파일 준비하고 올리는 중…</>}
      {!busy && <><span aria-hidden="true">+</span>PDF 추가</>}
    </button>
    <input ref={input} type="file" accept=".pdf,application/pdf" multiple disabled={busy || disabled} className={styles.hidden} aria-label="지원자 PDF 여러 개 선택" onChange={event => { setFolderError(""); onChoose(event.target.files); event.currentTarget.value = ""; }} />
    <input ref={folderInput} type="file" multiple {...{ webkitdirectory: "" }} disabled={busy || disabled} className={styles.hidden} aria-label="지원자 PDF 폴더 선택" onChange={event => {
      try { setFolderError(""); onChoose(folderPdfs(event.target.files ?? [])); }
      catch (cause) { setFolderError(cause instanceof Error ? cause.message : "폴더를 읽지 못했습니다."); }
      event.currentTarget.value = "";
    }} />
  </section>{folderError && <p role="alert" className="mb-2 text-sm text-fail">{folderError}</p>}</>;
}

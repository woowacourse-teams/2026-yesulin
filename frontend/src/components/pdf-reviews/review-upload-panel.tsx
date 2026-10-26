"use client";

import { type RefObject, type ReactNode } from "react";
import styles from "./screening.module.css";

type Props = {
  readonly children?: ReactNode;
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly busy: boolean;
  readonly disabled: boolean;
  readonly onChoose: (files: FileList | readonly File[] | null) => void;
};

export function ReviewUploadPanel({ busy, disabled, onChoose, children, inputRef: input }: Props) {
  return <section aria-label="지원서 PDF 올리기" className={styles.uploadToolbar}>
    {children}
    <button type="button" disabled={busy || disabled} className={`${styles.primary} ${styles.uploadAction}`} onClick={() => input.current?.click()}>
      <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V3m-5 5 5-5 5 5M4 15v5a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-5" /></svg>PDF 추가
    </button>
    <input ref={input} type="file" accept=".pdf,application/pdf" multiple disabled={busy || disabled} className={styles.hidden} aria-label="지원자 PDF 선택" onChange={event => { onChoose(event.target.files); event.currentTarget.value = ""; }} />
  </section>;
}

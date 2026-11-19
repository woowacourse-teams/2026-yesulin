"use client";

import type { PdfPagerState } from "@/components/pdf-extractions/pdf-pager";
import type { ReviewStatus, SubmissionId } from "@/features/pdf-reviews/screening-types";
import styles from "./fullscreen-dock.module.css";

export type DecidedStatus = Exclude<ReviewStatus, "PENDING">;
export const decisionOptions: readonly { readonly status: DecidedStatus; readonly label: string; readonly key: string; readonly code: string; readonly icon: string }[] = [
  { status: "FAIL", label: "불합격", key: "A", code: "KeyA", icon: "✕" },
  { status: "ETC", label: "보류", key: "S", code: "KeyS", icon: "–" },
  { status: "PASS", label: "합격", key: "D", code: "KeyD", icon: "✓" },
];
export const statusLabels: Readonly<Record<ReviewStatus, string>> = { PENDING: "미판정", PASS: "합격", ETC: "보류", FAIL: "불합격" };
const savedAs: Readonly<Record<ReviewStatus, string>> = { PENDING: "미판정으로", PASS: "합격으로", ETC: "보류로", FAIL: "불합격으로" };

export type LastDecision = { readonly id: SubmissionId; readonly heading: string; readonly previous: ReviewStatus; readonly next: DecidedStatus };

type DockProps = {
  readonly pager: PdfPagerState | null; readonly current: ReviewStatus; readonly stamp: DecidedStatus | null;
  readonly disabled: boolean; readonly onDecide: (status: DecidedStatus) => void;
};

export function FullscreenDock({ pager, current, stamp, disabled, onDecide }: DockProps) {
  return <div className={styles.dockLayer}>
    {stamp && <div className={styles.stamp} data-status={stamp} aria-hidden="true">{statusLabels[stamp]}</div>}
    {endNotice(pager) && <p role="status" className={`${styles.notice} ${styles.glass}`}>마지막 쪽이에요. 판정하거나 <kbd className={styles.key}>N</kbd>으로 다음 지원서를 보세요</p>}
    <div role="group" aria-label="지원자 심사 판정" className={`${styles.dock} ${styles.glass}`}>
      {decisionOptions.map(option => <button key={option.status} type="button" className={styles.decision} data-status={option.status} data-flash={stamp === option.status}
        aria-label={`${option.label} (${option.key})`} aria-pressed={current === option.status} disabled={disabled} onClick={() => onDecide(option.status)}>
        <span className={styles.icon} aria-hidden="true">{option.icon}</span>{option.label}<kbd className={styles.key} aria-hidden="true">{option.key}</kbd>
      </button>)}
      {pager && <PageIndicator pager={pager} />}
    </div>
  </div>;
}

function PageIndicator({ pager }: { readonly pager: PdfPagerState }) {
  return <>
    <span className={styles.separator} aria-hidden="true" />
    <span className={styles.pages}>
      <span className={styles.dots} aria-hidden="true">{Array.from({ length: pager.rows }, (_, index) => <i key={index} data-current={index === pager.row} />)}</span>
      <span className="num">{pageRange(pager)} / {pager.pages}쪽</span>
    </span>
  </>;
}

function pageRange(pager: PdfPagerState) {
  if (pager.firstPage === pager.lastPage) return String(pager.firstPage);
  return `${pager.firstPage}~${pager.lastPage}`;
}

function endNotice(pager: PdfPagerState | null) {
  return !!pager && pager.endAttempts > 0 && pager.row === pager.rows - 1;
}

export function UndoNotice({ last, disabled, onUndo, floating }: { readonly last: LastDecision; readonly disabled: boolean; readonly onUndo: () => void; readonly floating: boolean }) {
  const notice = <div role="status" className={`${styles.undo} ${styles.glass}`}>
    <span className={styles.undoDot} aria-hidden="true" />
    <span><strong>{last.heading}</strong> {savedAs[last.next]} 저장했어요</span>
    <button type="button" className={styles.undoButton} aria-label="되돌리기 (Z)" disabled={disabled} onClick={onUndo}>되돌리기<kbd className={styles.key} aria-hidden="true">Z</kbd></button>
  </div>;
  if (!floating) return notice;
  return <div className={styles.undoLayer}>{notice}</div>;
}

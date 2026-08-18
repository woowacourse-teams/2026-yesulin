"use client";

import { useState } from "react";
import { ROUND_LABELS, selectableStatuses, STATUS_LABELS } from "@/features/auditions/labels";
import type { Applicant, ReviewStatus } from "@/features/auditions/types";
import { useBoard } from "./board-context";

const STATUS_ACTIVE = {
  PASS: "text-pass bg-pass-bg border-pass",
  FAIL: "text-fail bg-fail-bg border-fail",
  ABSENT: "text-absent bg-absent-bg border-absent",
  ETC: "text-etc bg-etc-bg border-etc",
  PENDING: "text-pending bg-pending-bg border-pending",
} as const satisfies Record<ReviewStatus, string>;

export function DetailReview({ applicant }: { applicant: Applicant }) {
  const { board, visible, saving, roundClosed, reviewCurrent, patchReview, openApplicant } = useBoard();
  const index = visible.findIndex((candidate) => candidate.id === applicant.id);

  return (
    <footer className="flex flex-col gap-3 border-t border-border bg-card px-5 pb-4 pt-3.5">
      <div className="flex flex-wrap items-center gap-3.5 rounded-card border border-border bg-surface px-4 py-3">
        <span className="mr-1 flex flex-col">
          <strong className="text-sm font-bold text-foreground">심사 결정</strong>
          <span className="text-xs text-muted">{ROUND_LABELS[board.round]}</span>
        </span>

        {roundClosed ? (
          <span className="rounded-control border border-border bg-card px-3 py-2 text-xs text-muted">
            마감된 차수라 결과를 변경할 수 없습니다.
          </span>
        ) : (
          <>
            <div className="flex flex-wrap gap-1.5">
              {selectableStatuses(board.round).map((status) => {
                const active = applicant.review.status === status;
                return (
                  <button
                    key={status}
                    type="button"
                    aria-pressed={active}
                    disabled={saving}
                    onClick={() => {
                      // 같은 버튼을 다시 누르면 미검토로 되돌린다
                      void reviewCurrent(applicant.id, active ? "PENDING" : status);
                    }}
                    className={`min-h-11 rounded-control border px-5 py-2 text-base disabled:pointer-events-none disabled:border-border disabled:bg-border-soft disabled:text-muted md:text-dense ${
                      active ? `font-bold ${STATUS_ACTIVE[status]}` : "border-border bg-card hover:border-muted-soft"
                    }`}
                  >
                    {STATUS_LABELS[status]}
                  </button>
                );
              })}
            </div>
            {applicant.review.status === "ETC" ? (
              <DraftField
                key={`memo-${applicant.id}`}
                label="기타 사유"
                placeholder="사유 (예: 연락 두절)"
                value={applicant.review.memo}
                onCommit={(memo) => void patchReview(applicant.id, { memo })}
                className="min-w-40 flex-1 rounded-control border border-border px-3 py-2 text-dense"
              />
            ) : null}
          </>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          <span className="num mr-1 text-xs text-muted">
            {index + 1} / {visible.length}
          </span>
          <NavButton
            label="← 이전"
            disabled={index <= 0}
            onClick={() => openApplicant(visible[index - 1]?.id ?? null)}
          />
          <NavButton
            label="다음 →"
            disabled={index < 0 || index >= visible.length - 1}
            onClick={() => openApplicant(visible[index + 1]?.id ?? null)}
          />
        </div>
      </div>

      <DraftField
        key={`note-${applicant.id}`}
        multiline
        label="내부 심사 메모"
        hint="현재 배역·차수에만 저장되며 배우에게 공개되지 않습니다"
        placeholder="예: 발성 좋음, 앙상블로도 고려 가능"
        value={applicant.review.note}
        onCommit={(note) => void patchReview(applicant.id, { note })}
        className="min-h-14 w-full resize-y rounded-control border border-border bg-card px-3 py-2 text-dense leading-[1.55] focus:border-brand"
      />
    </footer>
  );
}

function NavButton({
  label,
  disabled,
  onClick,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="min-h-11 rounded-control border border-border bg-card px-3.5 py-2 text-base text-muted-strong hover:border-muted-soft hover:text-foreground disabled:cursor-not-allowed disabled:bg-border-soft disabled:text-muted md:text-xs"
    >
      {label}
    </button>
  );
}

/**
 * 입력 중에는 로컬 상태만 쓰고, 포커스를 잃을 때 한 번만 저장한다.
 * 배우가 바뀌면 호출부의 key로 새로 마운트되므로 값을 되맞출 필요가 없다.
 */
function DraftField({
  label,
  hint,
  placeholder,
  value,
  onCommit,
  className,
  multiline = false,
}: {
  label: string;
  hint?: string;
  placeholder: string;
  value: string;
  onCommit: (next: string) => void;
  className: string;
  multiline?: boolean;
}) {
  const [draft, setDraft] = useState(value);

  const commit = () => {
    if (draft !== value) onCommit(draft);
  };

  return (
    <label className={multiline ? "flex flex-col gap-1.5" : "contents"}>
      {multiline ? (
        <span className="flex items-baseline gap-2 text-xs font-semibold uppercase tracking-[0.04em] text-muted">
          {label}
          {hint ? <span className="font-normal normal-case tracking-normal">{hint}</span> : null}
        </span>
      ) : (
        <span className="sr-only">{label}</span>
      )}
      {multiline ? (
        <textarea
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          className={className}
        />
      ) : (
        <input
          value={draft}
          placeholder={placeholder}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={commit}
          className={className}
        />
      )}
    </label>
  );
}

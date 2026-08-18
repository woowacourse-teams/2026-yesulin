"use client";

import Link from "next/link";
import { useState } from "react";
import { saveReview } from "@/features/auditions/api";
import { ROUND_LABELS, selectableStatuses, STATUS_LABELS } from "@/features/auditions/labels";
import { auditionRoutes } from "@/features/auditions/routes";
import type { Applicant, AuditionBoardResponse, ReviewStatus } from "@/features/auditions/types";
import { errorMessage } from "@/features/auditions/use-audition-query";
import { useToast } from "./toast";

const STATUS_ACTIVE = {
  PASS: "border-pass bg-pass-bg text-pass",
  FAIL: "border-fail bg-fail-bg text-fail",
  ABSENT: "border-absent bg-absent-bg text-absent",
  ETC: "border-etc bg-etc-bg text-etc",
  PENDING: "border-pending bg-pending-bg text-pending",
} as const satisfies Record<ReviewStatus, string>;

export function ApplicantReviewDecision({
  board,
  applicant,
  onBoardChange,
}: {
  board: AuditionBoardResponse;
  applicant: Applicant;
  onBoardChange: (next: AuditionBoardResponse) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState(applicant.review.note);
  const [otherOpen, setOtherOpen] = useState(false);
  const [otherReason, setOtherReason] = useState(applicant.review.status === "ETC" ? applicant.review.memo : "");
  const toast = useToast();
  const roundClosed = board.rounds.find((state) => state.round === board.round)?.closed ?? false;
  const index = board.applicants.findIndex((candidate) => candidate.id === applicant.id);

  const commit = async (
    patch: { status?: ReviewStatus; memo?: string; note?: string },
    success?: string,
  ) => {
    setSaving(true);
    try {
      const next = await saveReview({
        roleId: board.role.id,
        round: board.round,
        applicationIds: [applicant.id],
        ...patch,
      });
      onBoardChange(next);
      if (success) toast(success, { type: "success" });
    } catch (cause: unknown) {
      toast(errorMessage(cause, "심사 내용을 저장하지 못했습니다."), { type: "error" });
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (status: ReviewStatus) => {
    const nextStatus = applicant.review.status === status ? "PENDING" : status;
    if (nextStatus === "ETC") { setOtherOpen(true); return; }
    setOtherOpen(false);
    await commit(
      { status: nextStatus },
      `${STATUS_LABELS[nextStatus]}로 저장했습니다.`,
    );
  };

  const previous = board.applicants[index - 1];
  const next = board.applicants[index + 1];

  return (
    <aside className="rounded-card border border-border bg-card p-4 lg:sticky lg:top-6 md:p-5">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-bold text-foreground">심사 결정</h2>
          <p className="mt-1 text-xs leading-relaxed text-muted">{ROUND_LABELS[board.round]} · 현재 배역과 차수에만 저장됩니다.</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {roundClosed ? (
            <p className="rounded-control border border-border bg-surface px-3 py-2 text-sm text-muted">
              마감된 차수라 결과를 변경할 수 없습니다.
            </p>
          ) : selectableStatuses(board.round).map((status) => {
            const active = applicant.review.status === status;
            return (
              <button
                key={status}
                type="button"
                aria-pressed={active}
                disabled={saving}
                onClick={() => void changeStatus(status)}
                className={`min-h-11 rounded-control border px-3 py-2 text-sm font-semibold transition-colors disabled:pointer-events-none disabled:opacity-60 ${
                  active ? STATUS_ACTIVE[status] : "border-border bg-card text-foreground hover:border-brand-line hover:bg-brand-soft"
                }`}
              >
                {STATUS_LABELS[status]}
              </button>
            );
          })}
        </div>

        {otherOpen ? <form onSubmit={(event) => { event.preventDefault(); const memo = otherReason.trim(); if (!memo) return; void commit({ status: "ETC", memo }, "기타로 저장했습니다.").then(() => setOtherOpen(false)); }} className="rounded-control border border-etc/30 bg-etc-bg p-3">
          <label className="block text-sm font-semibold text-etc">기타 사유<input autoFocus required maxLength={255} value={otherReason} onChange={(event) => setOtherReason(event.target.value)} placeholder="예: 다른 배역으로 검토" className="mt-2 min-h-11 w-full rounded-control border border-border bg-card px-3 text-sm text-foreground outline-none focus:border-etc focus:ring-2 focus:ring-etc-bg" /></label>
          <div className="mt-2 flex justify-end gap-2"><button type="button" onClick={() => setOtherOpen(false)} className="min-h-9 rounded-control px-3 text-xs font-semibold text-muted-strong">취소</button><button type="submit" disabled={saving || !otherReason.trim()} className="min-h-9 rounded-control border border-etc bg-card px-3 text-xs font-semibold text-etc disabled:opacity-50">기타로 저장</button></div>
        </form> : null}

        <nav aria-label="지원자 이동" className="flex items-center gap-2 border-t border-border-soft pt-4">
          <span className="num mr-auto text-xs text-muted">{index + 1} / {board.applicants.length}</span>
          <ApplicantLink label="← 이전" applicant={previous} board={board} />
          <ApplicantLink label="다음 →" applicant={next} board={board} />
        </nav>
      </div>

      <label className="mt-4 block border-t border-border-soft pt-4">
        <span className="flex flex-wrap items-baseline gap-2 text-sm font-semibold text-foreground">
          내부 심사 메모
          <small className="font-normal text-muted">배우에게 공개되지 않습니다.</small>
        </span>
        <textarea
          value={note}
          disabled={roundClosed || saving}
          onChange={(event) => setNote(event.target.value)}
          onBlur={() => {
            if (note !== applicant.review.note) void commit({ note }, "내부 메모를 저장했습니다.");
          }}
          placeholder="예: 발성 좋음, 앙상블로도 고려 가능"
          className="mt-2 min-h-20 w-full resize-y rounded-control border border-border bg-card px-3 py-2 text-sm leading-relaxed outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft disabled:bg-border-soft"
        />
      </label>
    </aside>
  );
}

function ApplicantLink({
  label,
  applicant,
  board,
}: {
  label: string;
  applicant: Applicant | undefined;
  board: AuditionBoardResponse;
}) {
  const style = "inline-flex min-h-11 items-center rounded-control border px-3.5 text-sm font-semibold";
  if (!applicant) return <span aria-disabled="true" className={`${style} border-border bg-border-soft text-muted`}>{label}</span>;
  return (
    <Link href={auditionRoutes.applicantReview(board.role.id, applicant.id, board.round)} className={`${style} border-border bg-card text-muted-strong hover:border-brand-line hover:bg-brand-soft hover:text-brand`}>
      {label}
    </Link>
  );
}

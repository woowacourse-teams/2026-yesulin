"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { getAuditionSubmission } from "@/features/auditions/api";
import type { AuditionListRouteState } from "@/features/auditions/filters";
import { auditionRoutes } from "@/features/auditions/routes";
import type {
  SubmissionId,
  AuditionBoardResponse,
  RoleId,
  RoundNumber,
} from "@/features/auditions/types";
import { useAuditionQuery } from "@/features/auditions/use-audition-query";
import { ApplicantReviewDecision } from "./applicant-review-decision";
import { ApplicantVideoSection } from "./applicant-video-section";
import { Breadcrumb } from "./breadcrumb";
import { DetailGallery } from "./detail-gallery";
import { DetailProfile } from "./detail-profile";
import { ScreenError, ScreenMessage } from "./screen-status";
import { StatusBadge } from "./status-badge";

export function ApplicantReview({
  roleId,
  submissionId,
  round,
  listState,
}: {
  roleId: RoleId;
  submissionId: SubmissionId;
  round: RoundNumber;
  listState: AuditionListRouteState;
}) {
  const [applied, setApplied] = useState<AuditionBoardResponse | null>(null);
  const load = useCallback(
    () => getAuditionSubmission(roleId, round, submissionId),
    [roleId, round, submissionId],
  );
  const { data, error, loading, reload } = useAuditionQuery(
    `${roleId}:${round}:${submissionId}`,
    load,
    "지원서를 불러오지 못했습니다.",
  );
  const board = applied ?? data;
  const applicant = board?.applicants.find((candidate) => candidate.id === submissionId) ?? null;
  const listHref = auditionRoutes.role(roleId, round, listState);

  return (
    <>
      <Breadcrumb
        items={[
          { label: "전체 공연", href: auditionRoutes.performances },
          {
            label: board?.performance.title ?? "공연",
            href: board ? auditionRoutes.performance(board.performance.id) : undefined,
          },
          {
            label: board?.posting.title ?? "공고",
            href: board ? auditionRoutes.posting(board.posting.id) : undefined,
          },
          { label: board?.role.name ?? "배역", href: listHref },
          { label: applicant?.name ?? "지원자 심사" },
        ]}
      />

      <div className="mx-auto w-full max-w-[1480px] px-4 pb-12 pt-5 md:px-8 md:pt-6">
        {error ? <ScreenError message={error} onRetry={reload} /> : null}
        {loading && !board ? <ReviewSkeleton /> : null}
        {board && !applicant ? (
          <ScreenMessage title="지원서를 찾을 수 없습니다.">
            현재 배역과 차수에 포함된 지원서인지 확인해 주세요.
          </ScreenMessage>
        ) : null}

        {board && applicant ? (
          <>
            <header className="mb-5 flex flex-wrap items-start gap-4">
              <div className="min-w-0 flex-1">
                <Link href={listHref} className="mb-3 inline-flex min-h-11 items-center text-sm font-semibold text-muted-strong hover:text-brand">
                  <span aria-hidden="true" className="mr-1.5">←</span>
                  {board.role.name} 지원자 목록
                </Link>
                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="text-[28px] font-bold tracking-[-0.03em] text-foreground">{applicant.name}</h1>
                  <StatusBadge status={applicant.review.status} memo={applicant.review.memo} />
                </div>
                <p className="mt-1 text-sm text-muted">
                  {board.role.name} 지원 · {round}차 심사 · 지원서 #{applicant.id}
                </p>
              </div>
            </header>

            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_250px] lg:items-start xl:grid-cols-[minmax(0,1fr)_260px]">
              <div className="min-w-0 space-y-4 xl:grid xl:grid-cols-[260px_minmax(0,1fr)] xl:items-start xl:gap-4 xl:space-y-0">
                <DetailGallery
                  applicant={applicant}
                  layout="review"
                  className="mx-auto w-full max-w-[360px] overflow-hidden rounded-card border border-border xl:sticky xl:top-16 xl:mx-0 xl:max-w-none"
                />
                <div className="min-w-0 overflow-hidden rounded-card border border-border bg-card">
                  <ApplicantVideoSection applicant={applicant} />
                  <DetailProfile applicant={applicant} rounds={board.rounds} />
                </div>
              </div>

              <ApplicantReviewDecision
                board={board}
                applicant={applicant}
                onBoardChange={setApplied}
                listState={listState}
              />
            </div>
          </>
        ) : null}
      </div>
    </>
  );
}

function ReviewSkeleton() {
  return (
    <div aria-label="지원서를 불러오는 중" className="animate-pulse">
      <div className="mb-6 h-16 w-64 rounded-card bg-border-soft" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_250px]">
        <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)]">
          <div className="aspect-[3/4] rounded-card bg-border-soft" />
          <div className="min-h-[620px] rounded-card border border-border bg-card" />
        </div>
        <div className="h-72 rounded-card border border-border bg-card" />
      </div>
    </div>
  );
}

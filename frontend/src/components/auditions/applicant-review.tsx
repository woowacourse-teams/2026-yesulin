"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { getAuditionBoard } from "@/features/auditions/api";
import { auditionRoutes } from "@/features/auditions/routes";
import type {
  ApplicationId,
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
  applicationId,
  round,
}: {
  roleId: RoleId;
  applicationId: ApplicationId;
  round: RoundNumber;
}) {
  const [applied, setApplied] = useState<AuditionBoardResponse | null>(null);
  const load = useCallback(() => getAuditionBoard(roleId, round), [roleId, round]);
  const { data, error, loading, reload } = useAuditionQuery(
    `${roleId}:${round}:${applicationId}`,
    load,
    "지원서를 불러오지 못했습니다.",
  );
  const board = applied ?? data;
  const applicant = board?.applicants.find((candidate) => candidate.id === applicationId) ?? null;
  const listHref = auditionRoutes.role(roleId, round);

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
              <div className="overflow-hidden rounded-card border border-border bg-card xl:grid xl:grid-cols-[260px_minmax(0,1fr)]">
                <DetailGallery
                  applicant={applicant}
                  layout="review"
                  className="mx-auto w-full max-w-[300px] xl:mx-0 xl:max-w-none"
                />
                <div className="min-w-0">
                  <ApplicantVideoSection applicant={applicant} />
                  <DetailProfile applicant={applicant} />
                </div>
              </div>

              <ApplicantReviewDecision
                board={board}
                applicant={applicant}
                onBoardChange={setApplied}
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
      <div className="grid overflow-hidden rounded-card border border-border bg-card lg:grid-cols-[240px_1fr]">
        <div className="aspect-[3/4] bg-border-soft" />
        <div className="min-h-[620px] bg-card" />
      </div>
    </div>
  );
}

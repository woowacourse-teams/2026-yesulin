"use client";

import { useCallback, useState } from "react";
import { getPostings } from "@/features/screening/api";
import { postingEntryHref, screeningRoutes } from "@/features/screening/routes";
import type { PerformanceId, PostingSummary } from "@/features/screening/types";
import { useScreeningQuery } from "@/features/screening/use-screening-query";
import { Breadcrumb } from "./breadcrumb";
import { FacePile } from "./applicant-photo";
import {
  PickerCard,
  PickerCardBlocked,
  PickerDescription,
  PickerEmpty,
  PickerProgress,
  PickerGrid,
  PickerHeader,
  PickerScreen,
  PickerState,
  PickerStats,
  PickerTitle,
} from "./picker-card";
import { CreatePageButton } from "./create-form";
import { PostingCreateModal } from "./posting-create-modal";
import { PhaseTag } from "./status-badge";
import { PickerSkeleton, ScreenError } from "./screen-status";
import { useToast } from "./toast";

const UPCOMING_NOTICE = "아직 시작 전인 공고입니다. 모집이 시작되면 열람할 수 있습니다.";

function deadlineText(posting: PostingSummary) {
  if (posting.phase === "UPCOMING") return `시작 예정 · ${posting.deadline}`;
  if (posting.phase === "OPEN") return `모집 중 · 마감 ${posting.deadline}`;
  return `접수 마감 · ${posting.deadline}`;
}

function stateText(posting: PostingSummary) {
  if (posting.allRoundsClosed) return "전형 종료";
  if (posting.applicantCount === 0) return "지원자 대기";
  return posting.pendingReviewCount > 0
    ? `검토 대기 ${posting.pendingReviewCount}명`
    : "검토 완료, 마감 대기";
}

export function PostingPicker({ performanceId }: { performanceId: PerformanceId }) {
  const [createOpen, setCreateOpen] = useState(false);
  const load = useCallback(() => getPostings(performanceId), [performanceId]);
  const { data, error, loading, reload } = useScreeningQuery(
    performanceId,
    load,
    "공고를 불러오지 못했습니다.",
  );
  const toast = useToast();
  const notifyUpcoming = useCallback(() => toast(UPCOMING_NOTICE), [toast]);

  return (
    <>
      <Breadcrumb
        items={[
          { label: "전체 공연", href: screeningRoutes.performances },
          { label: data?.performance.title ?? "공연" },
        ]}
      />
      {loading ? <PickerSkeleton /> : null}
      {error ? (
        <div className="p-4 md:p-6">
          <ScreenError message={error} />
        </div>
      ) : null}
      {data ? (
        <PickerScreen>
          <PickerHeader
            title="어떤 공고의 지원자를 보시겠어요?"
            subtitle={`${data.performance.title} · 공고 ${data.postings.length}건`}
          >
            <CreatePageButton onClick={() => setCreateOpen(true)}>공고 추가</CreatePageButton>
          </PickerHeader>
          <PickerGrid>
            {data.postings.length === 0 ? (
              <PickerEmpty>아직 등록된 공고가 없습니다.<br />우측 상단의 공고 추가를 눌러 첫 모집을 시작하세요.</PickerEmpty>
            ) : null}
            {data.postings.map((posting) => {
            const body = (
              <>
                <div>
                  <PickerTitle>
                    {posting.title}
                    <PhaseTag phase={posting.phase} />
                  </PickerTitle>
                  <PickerDescription>
                    {deadlineText(posting)} ·{" "}
                    {posting.isOpenCall ? "배역 구분 없음" : `배역 ${posting.roleCount}개`}
                  </PickerDescription>
                </div>
                <PickerStats
                  primary={{ value: posting.applicantCount, unit: "명 지원" }}
                  secondary={{ value: posting.quotaTotal, unit: "명 모집" }}
                />
                <FacePile urls={posting.previewPhotoUrls} />
                {posting.progress.total > 0 && !posting.allRoundsClosed ? (
                  <PickerProgress percent={posting.progress.percent} />
                ) : null}
                <PickerState
                  tone={
                    posting.allRoundsClosed
                      ? "done"
                      : posting.pendingReviewCount > 0
                        ? "pending"
                        : "idle"
                  }
                >
                  {stateText(posting)}
                </PickerState>
              </>
            );

            return posting.phase === "UPCOMING" ? (
              <PickerCardBlocked key={posting.id} onBlocked={notifyUpcoming}>
                {body}
              </PickerCardBlocked>
            ) : (
              <PickerCard key={posting.id} href={postingEntryHref(posting)}>
                {body}
              </PickerCard>
            );
            })}
          </PickerGrid>
        </PickerScreen>
      ) : null}
      {createOpen && data ? (
        <PostingCreateModal
          performanceId={performanceId}
          performanceTitle={data.performance.title}
          roleTemplates={data.roleTemplates}
          onClose={() => setCreateOpen(false)}
          onCreated={reload}
        />
      ) : null}
    </>
  );
}

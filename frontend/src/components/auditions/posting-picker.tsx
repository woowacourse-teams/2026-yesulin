"use client";

import { useCallback, useState } from "react";
import { getPostings } from "@/features/auditions/api";
import { postingEntryHref, auditionRoutes } from "@/features/auditions/routes";
import type { PerformanceId, PostingSummary } from "@/features/auditions/types";
import { useAuditionQuery } from "@/features/auditions/use-audition-query";
import { Breadcrumb } from "./breadcrumb";
import {
  PickerCard,
  PickerCardBlocked,
  PickerEmpty,
  PickerGrid,
  PickerHeader,
  PickerProgress,
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
import { PostingCardActions } from "./posting-card-actions";
import { PostingManageDialog } from "./posting-manage-dialog";

const UPCOMING_NOTICE = "아직 시작 전인 공고입니다. 모집이 시작되면 열람할 수 있습니다.";

function recruitmentState(posting: PostingSummary) {
  if (posting.phase === "UPCOMING") return "시작 예정";
  if (posting.phase === "OPEN") return "모집 중";
  return "접수 마감";
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
  const [manage, setManage] = useState<{ readonly posting: PostingSummary; readonly mode: "EDIT" | "DELETE" } | null>(null);
  const load = useCallback(() => getPostings(performanceId), [performanceId]);
  const { data, error, loading, reload } = useAuditionQuery(
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
          { label: "전체 공연", href: auditionRoutes.performances },
          { label: data?.performance.title ?? "공연" },
        ]}
      />
      {loading ? <PickerSkeleton /> : null}
      {error ? (
        <div className="p-4 md:p-6">
          <ScreenError message={error} onRetry={reload} />
        </div>
      ) : null}
      {data ? (
        <PickerScreen>
          <PickerHeader
            title="어떤 공고의 지원자를 보시겠어요?"
            subtitle={`${data.performance.title} · 공고 ${data.postings.length}건`}
          >
            {data.postings.length > 0 ? (
              <CreatePageButton onClick={() => setCreateOpen(true)}>공고 추가</CreatePageButton>
            ) : null}
          </PickerHeader>
          <PickerGrid>
            {data.postings.length === 0 ? (
              <PickerEmpty
                title="아직 등록된 공고가 없습니다"
                description="모집 기간과 배역, 전형 일정을 설정해 첫 모집을 시작하세요."
                action={<CreatePageButton onClick={() => setCreateOpen(true)}>첫 공고 추가</CreatePageButton>}
              />
            ) : null}
            {data.postings.map((posting) => {
            const body = (
              <>
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-2">
                  <PickerTitle>
                    {posting.title}
                    <PhaseTag phase={posting.phase} />
                  </PickerTitle>
                  <PickerState
                    tone={
                      posting.allRoundsClosed
                        ? "done"
                        : posting.pendingReviewCount > 0
                          ? "pending"
                          : "idle"
                    }
                    className="whitespace-nowrap border-0 pt-0"
                  >
                    {stateText(posting)}
                  </PickerState>
                </div>
                <div className="grid grid-cols-[1fr_1.1fr_0.9fr] divide-x divide-border-soft overflow-hidden rounded-lg border border-border-soft bg-surface">
                  <PostingMeta label="모집 상태" value={recruitmentState(posting)} />
                  <PostingMeta label="마감일" value={posting.deadline} numeric />
                  <PostingMeta
                    label="모집 배역"
                    value={posting.isOpenCall ? "구분 없음" : `${posting.roleCount}개`}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
                  <PickerStats
                    primary={{ value: posting.applicantCount, unit: "명 지원" }}
                    secondary={{ value: posting.quotaTotal, unit: "명 모집" }}
                  />
                  {posting.progress.total > 0 && !posting.allRoundsClosed ? (
                    <PickerProgress percent={posting.progress.percent} />
                  ) : null}
                </div>
              </>
            );

            return posting.phase === "UPCOMING" ? (
              <PickerCardBlocked
                key={posting.id}
                onBlocked={notifyUpcoming}
                action={
                  <PostingCardActions
                    postingId={posting.id}
                    onEdit={() => setManage({ posting, mode: "EDIT" })}
                    onDelete={() => setManage({ posting, mode: "DELETE" })}
                  />
                }
              >
                {body}
              </PickerCardBlocked>
            ) : (
              <PickerCard
                key={posting.id}
                href={postingEntryHref(posting)}
                action={
                  <PostingCardActions
                    postingId={posting.id}
                    onEdit={() => setManage({ posting, mode: "EDIT" })}
                    onDelete={() => setManage({ posting, mode: "DELETE" })}
                  />
                }
              >
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
      {manage ? <PostingManageDialog posting={manage.posting} mode={manage.mode} onClose={() => setManage(null)} onChanged={reload} /> : null}
    </>
  );
}

function PostingMeta({
  label,
  value,
  numeric = false,
}: {
  label: string;
  value: string;
  numeric?: boolean;
}) {
  return (
    <span className="min-w-0 px-2.5 py-2.5">
      <span className="block text-xs font-medium text-muted">{label}</span>
      <b className={`${numeric ? "num" : ""} mt-1 block truncate text-xs font-semibold text-foreground`}>
        {value}
      </b>
    </span>
  );
}

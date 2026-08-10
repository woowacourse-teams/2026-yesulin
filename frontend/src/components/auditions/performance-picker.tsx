"use client";

import Image from "next/image";
import { useState } from "react";
import { getPerformances } from "@/features/auditions/api";
import { auditionRoutes } from "@/features/auditions/routes";
import { useAuditionQuery } from "@/features/auditions/use-audition-query";
import { Breadcrumb } from "./breadcrumb";
import { FacePile } from "./applicant-photo";
import {
  PickerCard,
  PickerDescription,
  PickerEmpty,
  PickerGrid,
  PickerHeader,
  PickerScreen,
  PickerState,
  PickerStats,
  PickerTitle,
} from "./picker-card";
import { CreatePageButton } from "./create-form";
import { PerformanceCreateModal } from "./performance-create-modal";
import { PickerSkeleton, ScreenError } from "./screen-status";
import type { PerformanceSummary } from "@/features/auditions/types";
import { PerformanceManageDialog } from "./performance-manage-dialog";
import { DestructiveButton, SecondaryButton } from "./ui-controls";

export function PerformancePicker() {
  const [createOpen, setCreateOpen] = useState(false);
  const [manage, setManage] = useState<{ readonly performance: PerformanceSummary; readonly mode: "EDIT" | "DELETE" } | null>(null);
  const { data, error, loading, reload } = useAuditionQuery(
    "performances",
    getPerformances,
    "공연을 불러오지 못했습니다.",
  );

  return (
    <>
      <Breadcrumb items={[{ label: "전체 공연" }]} />
      {loading ? <PickerSkeleton /> : null}
      {error ? (
        <div className="p-4 md:p-6">
          <ScreenError message={error} onRetry={reload} />
        </div>
      ) : null}
      {data ? (
        <PickerScreen>
          <PickerHeader title="공연을 선택하세요" subtitle={`등록된 공연 ${data.performances.length}건`}>
            {data.performances.length > 0 ? (
              <CreatePageButton onClick={() => setCreateOpen(true)}>공연 추가</CreatePageButton>
            ) : null}
          </PickerHeader>
          <PickerGrid>
            {data.performances.length === 0 ? (
              <PickerEmpty
                title="아직 등록된 공연이 없습니다"
                description="첫 공연과 배역 조건을 등록하면 모집 공고를 이어서 만들 수 있습니다."
                action={<CreatePageButton onClick={() => setCreateOpen(true)}>첫 공연 추가</CreatePageButton>}
              />
            ) : null}
            {data.performances.map((performance, index) => (
              <PickerCard key={performance.id} href={auditionRoutes.performance(performance.id)} action={<div className="flex gap-2"><SecondaryButton className="px-3 text-xs" onClick={() => setManage({ performance, mode: "EDIT" })}>수정</SecondaryButton><DestructiveButton className="px-3 text-xs" onClick={() => setManage({ performance, mode: "DELETE" })}>삭제</DestructiveButton></div>}>
                <div className="flex items-start gap-3">
                  <div className="relative aspect-[3/4] w-[66px] shrink-0 overflow-hidden rounded-md bg-surface">
                    <Image
                      src={performance.posterUrl}
                      alt={`${performance.title} 포스터`}
                      fill
                      unoptimized
                      priority={index === 0}
                      sizes="66px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 pt-1">
                    <PickerTitle>{performance.title}</PickerTitle>
                    <PickerDescription>{performance.venue}</PickerDescription>
                  </div>
                </div>
                <PickerStats
                  primary={{ value: performance.postingCount, unit: "개 공고" }}
                  secondary={{ value: performance.applicantCount, unit: "명 지원" }}
                />
                <FacePile urls={performance.previewPhotoUrls} />
                <PickerState tone={performance.pendingReviewCount > 0 ? "pending" : "idle"}>
                  {performance.pendingReviewCount > 0
                    ? `검토 대기 ${performance.pendingReviewCount}명`
                    : `모집 중 ${performance.openPostingCount}건`}
                </PickerState>
              </PickerCard>
            ))}
          </PickerGrid>
        </PickerScreen>
      ) : null}
      {createOpen ? (
        <PerformanceCreateModal onClose={() => setCreateOpen(false)} onCreated={reload} />
      ) : null}
      {manage ? <PerformanceManageDialog performance={manage.performance} mode={manage.mode} onClose={() => setManage(null)} onChanged={reload} /> : null}
    </>
  );
}

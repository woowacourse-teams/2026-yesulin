"use client";

import Image from "next/image";
import { useState } from "react";
import { getPerformances } from "@/features/screening/api";
import { screeningRoutes } from "@/features/screening/routes";
import { useScreeningQuery } from "@/features/screening/use-screening-query";
import { Breadcrumb } from "./breadcrumb";
import { FacePile } from "./applicant-photo";
import {
  PickerCard,
  PickerDescription,
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

export function PerformancePicker() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data, error, loading, reload } = useScreeningQuery(
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
          <ScreenError message={error} />
        </div>
      ) : null}
      {data ? (
        <PickerScreen>
          <PickerHeader title="공연을 선택하세요" subtitle={`등록된 공연 ${data.performances.length}건`}>
            <CreatePageButton onClick={() => setCreateOpen(true)}>공연 추가</CreatePageButton>
          </PickerHeader>
          <PickerGrid>
            {data.performances.map((performance) => (
              <PickerCard key={performance.id} href={screeningRoutes.performance(performance.id)}>
                <div className="flex items-start gap-3">
                  <div className="relative aspect-[3/4] w-[66px] shrink-0 overflow-hidden rounded-md bg-surface">
                    <Image
                      src={performance.posterUrl}
                      alt={`${performance.title} 포스터`}
                      fill
                      unoptimized
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
    </>
  );
}

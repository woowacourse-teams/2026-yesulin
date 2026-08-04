"use client";

import { getPerformances } from "@/features/screening/api";
import { screeningRoutes } from "@/features/screening/routes";
import { useScreeningQuery } from "@/features/screening/use-screening-query";
import { Breadcrumb } from "./breadcrumb";
import { FacePile } from "./applicant-photo";
import {
  PickerCard,
  PickerDescription,
  PickerScreen,
  PickerState,
  PickerStats,
  PickerTitle,
} from "./picker-card";
import { PickerSkeleton, ScreenError } from "./screen-status";

export function PerformancePicker() {
  const { data, error, loading } = useScreeningQuery(
    "performances",
    getPerformances,
    "공연을 불러오지 못했습니다.",
  );

  return (
    <>
      <Breadcrumb items={[{ icon: "🏠", label: "전체 공연" }]} />
      {loading ? <PickerSkeleton /> : null}
      {error ? (
        <div className="p-4 md:p-6">
          <ScreenError message={error} />
        </div>
      ) : null}
      {data ? (
        <PickerScreen title="공연을 선택하세요" subtitle={`등록된 공연 ${data.performances.length}건`}>
          {data.performances.map((performance) => (
            <PickerCard key={performance.id} href={screeningRoutes.performance(performance.id)}>
              <div>
                <PickerTitle icon={performance.icon}>{performance.title}</PickerTitle>
                <PickerDescription>{performance.venue}</PickerDescription>
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
        </PickerScreen>
      ) : null}
    </>
  );
}

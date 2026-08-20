"use client";

import Image from "next/image";
import { useState } from "react";
import { getPerformances } from "@/features/auditions/api";
import { auditionRoutes } from "@/features/auditions/routes";
import type { PerformanceSummary } from "@/features/auditions/types";
import { useAuditionQuery } from "@/features/auditions/use-audition-query";
import { Breadcrumb } from "./breadcrumb";
import { CreatePageButton } from "./create-form";
import { PerformanceCreateModal } from "./performance-create-modal";
import { PerformanceManageDialog } from "./performance-manage-dialog";
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
import { PickerSkeleton, ScreenError } from "./screen-status";
import { DestructiveButton, SecondaryButton } from "@/components/ui/controls";

export function PerformancePicker() {
  const [createOpen, setCreateOpen] = useState(false);
  const [manage, setManage] = useState<{ readonly performance: PerformanceSummary; readonly mode: "EDIT" | "DELETE" } | null>(null);
  const { data, error, loading, reload } = useAuditionQuery("performances", getPerformances, "공연을 불러오지 못했습니다.");

  return <>
    <Breadcrumb items={[{ label: "공연 관리" }]} />
    {loading ? <PickerSkeleton /> : null}
    {error ? <div className="p-4 md:p-6"><ScreenError message={error} onRetry={reload} /></div> : null}
    {data ? <PickerScreen>
      <PickerHeader title="공연 관리">{data.performances.length > 0 ? <CreatePageButton onClick={() => setCreateOpen(true)}>공연 추가</CreatePageButton> : null}</PickerHeader>
      <PickerGrid>
        {data.performances.length === 0 ? <PickerEmpty title="아직 등록된 공연이 없습니다" description="첫 공연과 배역을 등록한 뒤 모집 공고를 만들어 보세요." action={<CreatePageButton onClick={() => setCreateOpen(true)}>첫 공연 추가</CreatePageButton>} /> : null}
        {data.performances.map((performance, index) => <PickerCard key={performance.id} href={auditionRoutes.performance(performance.id)} action={<div className="flex gap-2"><SecondaryButton className="px-3 text-xs" onClick={() => setManage({ performance, mode: "EDIT" })}>수정</SecondaryButton><DestructiveButton className="px-3 text-xs" onClick={() => setManage({ performance, mode: "DELETE" })}>삭제</DestructiveButton></div>}>
          <div className="flex items-start gap-4">
            <div className="relative aspect-[3/4] w-24 shrink-0 overflow-hidden rounded-lg bg-surface"><Image src={performance.posterUrl} alt={`${performance.title} 포스터`} fill unoptimized priority={index === 0} sizes="96px" className="object-cover" /></div>
            <div className="min-w-0 flex-1 pt-1"><PickerTitle>{performance.title}</PickerTitle><PickerDescription>{performance.venue}</PickerDescription><p className="mt-2 line-clamp-2 text-xs leading-5 text-muted">{performance.venueAddress.roadAddress}</p></div>
          </div>
          <PickerStats primary={{ value: performance.postingCount, unit: "개 공고" }} secondary={{ value: performance.applicantCount, unit: "명 지원" }} />
          <PickerState tone={performance.pendingReviewCount > 0 ? "pending" : "idle"}>{performance.pendingReviewCount > 0 ? `검토 대기 ${performance.pendingReviewCount}건` : `모집 중 ${performance.openPostingCount}건`}</PickerState>
        </PickerCard>)}
      </PickerGrid>
    </PickerScreen> : null}
    {createOpen ? <PerformanceCreateModal onClose={() => setCreateOpen(false)} onCreated={reload} /> : null}
    {manage ? <PerformanceManageDialog performance={manage.performance} mode={manage.mode} onClose={() => setManage(null)} onChanged={reload} /> : null}
  </>;
}

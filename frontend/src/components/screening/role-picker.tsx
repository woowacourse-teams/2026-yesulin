"use client";

import { useCallback } from "react";
import { getRoles } from "@/features/screening/api";
import { ROUND_LABELS } from "@/features/screening/labels";
import { screeningRoutes } from "@/features/screening/routes";
import type { PostingId, RoleSummary } from "@/features/screening/types";
import { useScreeningQuery } from "@/features/screening/use-screening-query";
import { Breadcrumb } from "./breadcrumb";
import {
  PickerCard,
  PickerDescription,
  PickerProgress,
  PickerScreen,
  PickerState,
  PickerStats,
  PickerTitle,
} from "./picker-card";
import { PickerSkeleton, ScreenError } from "./screen-status";

/** 경쟁률 = 지원 인원 / 모집 인원. 배역 간 난이도 비교에 쓴다. */
const HOT_RATE = 10;

function stateText(role: RoleSummary) {
  if (role.allRoundsClosed) return "전형 종료";
  const round = ROUND_LABELS[role.activeRound];
  return role.counts.pending > 0
    ? `${round} · 검토 대기 ${role.counts.pending}명`
    : `${round} · 검토 완료, 마감 대기`;
}

export function RolePicker({ postingId }: { postingId: PostingId }) {
  const load = useCallback(() => getRoles(postingId), [postingId]);
  const { data, error, loading } = useScreeningQuery(postingId, load, "배역을 불러오지 못했습니다.");

  return (
    <>
      <Breadcrumb
        items={[
          { icon: "🏠", label: "전체 공연", href: screeningRoutes.performances },
          {
            icon: data?.performance.icon ?? "🎭",
            label: data?.performance.title ?? "공연",
            href: data ? screeningRoutes.performance(data.performance.id) : undefined,
          },
          { icon: data?.posting.icon ?? "📄", label: data?.posting.title ?? "공고" },
        ]}
      />
      {loading ? <PickerSkeleton /> : null}
      {error ? (
        <div className="p-4 md:p-6">
          <ScreenError message={error} />
        </div>
      ) : null}
      {data ? (
        <PickerScreen
          title="어떤 배역의 지원자를 보시겠어요?"
          subtitle="배역마다 전형이 따로 진행됩니다. 차수가 배역별로 독립 관리됩니다."
        >
          {data.roles.map((role) => {
            const rate = role.quota > 0 ? role.applicantCount / role.quota : 0;

            return (
              <PickerCard key={role.id} href={screeningRoutes.role(role.id)}>
                <div>
                  <PickerTitle>
                    {role.name}
                    {role.applicantCount > 0 ? (
                      <span
                        className={`num shrink-0 rounded-full px-[7px] py-0.5 text-[11px] font-bold ${
                          rate >= HOT_RATE ? "bg-brand-soft text-brand" : "bg-pending-bg text-muted-strong"
                        }`}
                      >
                        {rate.toFixed(1)} : 1
                      </span>
                    ) : null}
                  </PickerTitle>
                  <PickerDescription>{role.description}</PickerDescription>
                </div>
                <PickerStats
                  primary={{ value: role.applicantCount, unit: "명 지원" }}
                  secondary={{ value: role.quota, unit: "명 모집" }}
                />
                {role.applicantCount > 0 && !role.allRoundsClosed ? (
                  <PickerProgress percent={role.progress.percent} />
                ) : null}
                <PickerState
                  tone={role.allRoundsClosed ? "done" : role.counts.pending > 0 ? "pending" : "idle"}
                >
                  {stateText(role)}
                </PickerState>
              </PickerCard>
            );
          })}
        </PickerScreen>
      ) : null}
    </>
  );
}

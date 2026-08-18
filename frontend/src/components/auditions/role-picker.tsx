"use client";

import Link from "next/link";
import { useCallback } from "react";
import { SecondaryLink } from "@/components/ui/controls";
import { getRoles } from "@/features/auditions/api";
import { ROUND_LABELS } from "@/features/auditions/labels";
import { auditionRoutes } from "@/features/auditions/routes";
import type { PostingId, RoleSummary } from "@/features/auditions/types";
import { useAuditionQuery } from "@/features/auditions/use-audition-query";
import { ApplicationLinkButton } from "./application-link-button";
import { Breadcrumb } from "./breadcrumb";
import { PickerEmpty, PickerHeader, PickerScreen } from "./picker-card";
import { PickerSkeleton, ScreenError } from "./screen-status";

function RoleStatus({ role }: { role: RoleSummary }) {
  if (role.allRoundsClosed) {
    return <span className="rounded-full border border-pass/30 bg-pass-bg px-2.5 py-1 text-xs font-semibold text-pass">전형 종료</span>;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="rounded-full bg-brand-soft px-2.5 py-1 text-xs font-semibold text-brand">
        {ROUND_LABELS[role.activeRound]}
      </span>
      <span className={`text-xs font-semibold ${role.counts.pending > 0 ? "text-warn" : "text-muted"}`}>
        {role.applicantCount === 0
          ? "지원자 대기"
          : role.counts.pending > 0
            ? `검토 대기 ${role.counts.pending}명`
            : "검토 완료 · 마감 대기"}
      </span>
    </div>
  );
}

function RoleRow({ role }: { role: RoleSummary }) {
  const rate = role.quota > 0 ? role.applicantCount / role.quota : 0;

  return (
    <li>
      <Link
        href={auditionRoutes.role(role.id)}
        className="group grid min-w-0 gap-5 border-t border-border-soft px-5 py-5 transition-colors hover:bg-brand-soft focus-visible:relative focus-visible:z-10 md:px-6 lg:grid-cols-[minmax(180px,1.3fr)_minmax(145px,1fr)_minmax(190px,1.2fr)_minmax(150px,1fr)_24px] lg:items-center lg:gap-4"
      >
        <div className="min-w-0">
          <h2 className="truncate text-lg font-bold tracking-[-0.015em] group-hover:text-brand">{role.name}</h2>
          <p className="mt-1 line-clamp-2 text-sm leading-5 text-muted">{role.description}</p>
        </div>

        <div className="lg:min-w-0">
          <span className="mb-2 block text-xs font-semibold text-muted lg:hidden">현재 전형</span>
          <RoleStatus role={role} />
        </div>

        <dl className="grid grid-cols-3 gap-3 rounded-control bg-surface px-4 py-3 lg:bg-transparent lg:p-0">
          <div>
            <dt className="text-xs text-muted">지원</dt>
            <dd className="num mt-0.5 text-base font-bold"><b>{role.applicantCount}</b><span className="ml-0.5 text-xs font-medium text-muted">명</span></dd>
          </div>
          <div>
            <dt className="text-xs text-muted">모집</dt>
            <dd className="num mt-0.5 text-base font-bold"><b>{role.quota}</b><span className="ml-0.5 text-xs font-medium text-muted">명</span></dd>
          </div>
          <div>
            <dt className="text-xs text-muted">경쟁률</dt>
            <dd className="num mt-0.5 text-base font-bold">{rate.toFixed(1)}<span className="ml-0.5 text-xs font-medium text-muted">: 1</span></dd>
          </div>
        </dl>

        <div>
          <div className="flex items-center justify-between gap-3 text-xs">
            <span className="font-semibold text-muted-strong">검토 진행</span>
            <span className="num text-muted">{role.progress.done}/{role.progress.total}명 · {role.progress.percent}%</span>
          </div>
          <div role="progressbar" aria-label={`${role.name} 검토 진행률`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={role.progress.percent} className="mt-2 h-1.5 overflow-hidden rounded-full bg-border-soft">
            <span className="block h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${role.progress.percent}%` }} />
          </div>
        </div>

        <span className="inline-flex min-h-10 items-center justify-center gap-1.5 justify-self-start rounded-control border border-border bg-card px-3 text-sm font-semibold text-muted-strong transition-colors group-hover:border-brand-line group-hover:text-brand lg:min-h-0 lg:w-6 lg:justify-self-end lg:border-0 lg:bg-transparent lg:p-0">
          <span className="lg:sr-only">지원자 보기</span>
          <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current stroke-2"><path d="m7.5 4.5 5 5-5 5" /></svg>
        </span>
      </Link>
    </li>
  );
}

export function RolePicker({ postingId }: { postingId: PostingId }) {
  const load = useCallback(() => getRoles(postingId), [postingId]);
  const { data, error, loading, reload } = useAuditionQuery(postingId, load, "배역을 불러오지 못했습니다.");

  return (
    <>
      <Breadcrumb items={[{ label: "전체 공연", href: auditionRoutes.performances }, { label: data?.performance.title ?? "공연", href: data ? auditionRoutes.performance(data.performance.id) : undefined }, { label: data?.posting.title ?? "공고" }]} />
      {loading ? <PickerSkeleton /> : null}
      {error ? <div className="p-4 md:p-6"><ScreenError message={error} onRetry={reload} /></div> : null}
      {data ? (
        <PickerScreen>
          <PickerHeader title="배역별 지원 현황" subtitle="배역을 선택하면 해당 배역의 지원자와 전형을 관리할 수 있습니다.">
            <ApplicationLinkButton postingId={postingId} compact />
          </PickerHeader>

          {data.roles.length === 0 ? (
            <div className="grid"><PickerEmpty title="이 공고에 등록된 배역이 없습니다" description="공고에 모집 배역을 추가한 뒤 배우 심사를 시작할 수 있습니다." action={<SecondaryLink href={auditionRoutes.performance(data.performance.id)}>공고 목록으로 돌아가기</SecondaryLink>} /></div>
          ) : (
            <section aria-labelledby="role-list-title" className="overflow-hidden rounded-card border border-border bg-card">
              <div className="flex items-center justify-between gap-4 px-5 py-4 md:px-6">
                <h2 id="role-list-title" className="text-lg font-bold">모집 배역</h2>
                <span className="num text-sm font-semibold text-muted">{data.roles.length}개</span>
              </div>
              <div aria-hidden="true" className="hidden grid-cols-[minmax(180px,1.3fr)_minmax(145px,1fr)_minmax(190px,1.2fr)_minmax(150px,1fr)_24px] gap-4 border-t border-border-soft bg-surface px-6 py-2.5 text-xs font-semibold text-muted lg:grid">
                <span>배역</span><span>현재 전형</span><span>지원 현황</span><span>검토 진행</span><span />
              </div>
              <ul>{data.roles.map((role) => <RoleRow key={role.id} role={role} />)}</ul>
            </section>
          )}
        </PickerScreen>
      ) : null}
    </>
  );
}

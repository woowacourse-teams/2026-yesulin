"use client";

import { useState } from "react";
import type { AdminAuditLogPage, AdminMemberStats, AdminProducer } from "@/features/admin/types";
import { FilterChip } from "@/components/ui/controls";
import { AdminAuditLogTable } from "./admin-audit-log-table";
import { AdminAuditionTable } from "./admin-audition-table";
import { AdminProducerTable } from "./admin-producer-table";
import { AdminShowTable } from "./admin-show-table";
import { formatCount, SummaryItem, SummaryStrip } from "./admin-stat";
import type { DashboardData } from "./use-admin-dashboard";

type SignupRow = {
  readonly label: string;
  readonly description: string;
  readonly count: number;
};

function signupRows(stats: AdminMemberStats): readonly SignupRow[] {
  const rows: SignupRow[] = [
    { label: "카카오", description: "배우", count: stats.signupMethods.kakao },
    { label: "네이버", description: "배우", count: stats.signupMethods.naver },
    { label: "구글", description: "배우", count: stats.signupMethods.google },
    { label: "이메일", description: "기획사·제작사", count: stats.signupMethods.email },
  ];
  if (stats.signupMethods.unknownApplicants > 0) {
    rows.push({ label: "소셜 계정 없음", description: "배우", count: stats.signupMethods.unknownApplicants });
  }
  return rows;
}

function SignupMethods({ stats }: { readonly stats: AdminMemberStats }) {
  const rows = signupRows(stats);
  const max = Math.max(1, ...rows.map((row) => row.count));
  return (
    <section aria-labelledby="signup-methods-heading" className="rounded-card border border-border bg-card px-5 py-4">
      <h2 id="signup-methods-heading" className="text-base font-bold text-foreground">가입 경로</h2>
      <p className="mt-1 text-xs text-muted">한 배우가 여러 소셜 계정을 연결하면 경로마다 셉니다.</p>
      <ul className="mt-4 flex flex-col gap-3">
        {rows.map((row) => (
          <li key={row.label} className="grid grid-cols-[6.5rem_minmax(0,1fr)_3.5rem] items-center gap-3">
            <span className="text-sm font-semibold text-foreground">
              {row.label}
              <span className="block text-xs font-normal text-muted">{row.description}</span>
            </span>
            <span aria-hidden className="h-2.5 overflow-hidden rounded-full bg-border-soft">
              <span
                className="block h-full rounded-full bg-brand"
                style={{ width: `${(row.count / max) * 100}%` }}
              />
            </span>
            <span className="num text-right text-sm font-bold text-foreground">{formatCount(row.count)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function NewMembersTable({ stats }: { readonly stats: AdminMemberStats }) {
  const periods = [
    { label: "오늘", value: stats.today },
    { label: "최근 7일", value: stats.lastWeek },
    { label: "최근 30일", value: stats.lastMonth },
  ];
  return (
    <section aria-labelledby="new-members-heading" className="rounded-card border border-border bg-card px-5 py-4">
      <h2 id="new-members-heading" className="text-base font-bold text-foreground">신규 가입</h2>
      <p className="mt-1 text-xs text-muted">한국 시간 기준</p>
      <table className="mt-3 w-full text-left text-sm">
        <thead className="text-xs text-muted">
          <tr>
            <th scope="col" className="py-2 font-semibold">기간</th>
            <th scope="col" className="py-2 text-right font-semibold">배우</th>
            <th scope="col" className="py-2 text-right font-semibold">기획사</th>
            <th scope="col" className="py-2 text-right font-semibold">합계</th>
          </tr>
        </thead>
        <tbody>
          {periods.map((period) => (
            <tr key={period.label} className="border-t border-border-soft">
              <th scope="row" className="py-2.5 font-semibold text-foreground">{period.label}</th>
              <td className="num py-2.5 text-right text-muted-strong">{formatCount(period.value.applicants)}</td>
              <td className="num py-2.5 text-right text-muted-strong">{formatCount(period.value.producers)}</td>
              <td className="num py-2.5 text-right font-bold text-foreground">
                {formatCount(period.value.applicants + period.value.producers)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

export function AdminMembersSection({ data }: { readonly data: DashboardData }) {
  const { memberStats: stats } = data;
  return (
    <>
      <SummaryStrip>
        <SummaryItem label="배우" value={stats.applicants} unit="명" />
        <SummaryItem label="기획사·제작사" value={stats.producers} unit="곳" />
        <SummaryItem label="오늘 가입" value={stats.today.applicants + stats.today.producers} unit="명" />
        <SummaryItem label="최근 7일 가입" value={stats.lastWeek.applicants + stats.lastWeek.producers} unit="명" />
      </SummaryStrip>
      <div className="grid gap-4 lg:grid-cols-2">
        <SignupMethods stats={stats} />
        <NewMembersTable stats={stats} />
      </div>
      <p className="text-xs leading-5 text-muted">
        로그인·방문 기록은 저장하지 않아 활성 사용자 수는 제공하지 않아요. 방문 통계는 GA4에서 확인해 주세요.
      </p>
    </>
  );
}

type ProducerFilter = AdminProducer["status"] | "ALL";

const PRODUCER_FILTERS: readonly { readonly label: string; readonly value: ProducerFilter }[] = [
  { label: "전체", value: "ALL" },
  { label: "인증 대기", value: "PENDING" },
  { label: "활성", value: "ACTIVE" },
];

export function AdminProducersSection({ data, onChanged }: { readonly data: DashboardData; readonly onChanged: () => void }) {
  const [filter, setFilter] = useState<ProducerFilter>("ALL");
  const { overview } = data;
  const producers = filter === "ALL" ? data.producers : data.producers.filter((producer) => producer.status === filter);
  return (
    <>
      <SummaryStrip>
        <SummaryItem label="전체" value={overview.producers} unit="곳" />
        <SummaryItem label="활성" value={overview.activeProducers} unit="곳" />
        <SummaryItem
          label="이메일 인증 대기"
          value={overview.pendingProducers}
          unit="곳"
          emphasis={overview.pendingProducers > 0}
        />
        <SummaryItem label="최근 7일 가입" value={overview.newProducersInLastWeek} unit="곳" />
      </SummaryStrip>
      <p className="-mt-2 text-xs leading-5 text-muted">
        수동 활성화는 기획사 이메일 인증을 대신하므로 필요한 경우에만 사용하세요. 변경은 변경 기록에 남아요.
      </p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="기획사 상태 필터">
        {PRODUCER_FILTERS.map((option) => (
          <FilterChip key={option.value} pressed={filter === option.value} onClick={() => setFilter(option.value)}>
            {option.label}
          </FilterChip>
        ))}
      </div>
      <AdminProducerTable producers={producers} onChanged={onChanged} />
    </>
  );
}

export function AdminAuditionsSection({ data, onChanged }: { readonly data: DashboardData; readonly onChanged: () => void }) {
  const { overview } = data;
  return (
    <>
      <SummaryStrip>
        <SummaryItem
          label="공고"
          value={overview.auditions}
          unit="건"
          hint={`공개 ${overview.publishedAuditions} · 작성 중 ${overview.draftAuditions} · 마감 ${overview.closedAuditions}`}
        />
        <SummaryItem label="지원서" value={overview.submissions} unit="건" hint={`최근 7일 +${overview.newSubmissionsInLastWeek}`} />
        <SummaryItem label="OTR 공고" value={overview.otrAuditions} unit="건" />
        <SummaryItem
          label="OTR 지원서"
          value={overview.otrSubmissions}
          unit="건"
          hint={`최근 7일 +${overview.newOtrSubmissionsInLastWeek}`}
        />
      </SummaryStrip>
      <p className="-mt-2 text-xs leading-5 text-muted">
        아래 목록은 일반 공고예요. OTR 공고는 숫자만 집계하고 목록은 아직 운영 화면에 없어요.
      </p>
      <AdminAuditionTable auditions={data.auditions} onChanged={onChanged} />
    </>
  );
}

export function AdminShowsSection({ data }: { readonly data: DashboardData }) {
  const { overview } = data;
  return (
    <>
      <SummaryStrip>
        <SummaryItem label="예매 중 공연" value={overview.openShows} unit="편" hint={`전체 ${overview.shows}편`} />
        <SummaryItem label="확정 예매 매수" value={overview.reservedTickets} unit="매" />
        <SummaryItem label="최근 7일 예매" value={overview.newReservationsInLastWeek} unit="건" hint="현재 확정 기준" />
      </SummaryStrip>
      <p className="-mt-2 text-xs leading-5 text-muted">
        예매자 이름·연락처는 이 화면에 표시하지 않아요. 명단은 각 기획사가 공연 관리 화면에서 확인해요.
      </p>
      <AdminShowTable shows={data.shows} now={data.loadedAt} />
    </>
  );
}

export function AdminAuditSection({
  auditLogs,
  onPageChange,
}: {
  readonly auditLogs: AdminAuditLogPage | null;
  readonly onPageChange: (page: number) => void;
}) {
  if (!auditLogs) return <p className="text-sm text-muted">변경 기록을 불러오는 중이에요.</p>;
  return <AdminAuditLogTable page={auditLogs} onPageChange={onPageChange} />;
}

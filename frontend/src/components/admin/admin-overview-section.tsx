import Link from "next/link";
import { buildAttentions } from "@/features/admin/insights";
import { adminSectionHref } from "@/features/admin/sections";
import { AdminActivityCharts } from "./admin-activity-charts";
import { StatGroup, StatTile } from "./admin-stat";
import type { DashboardData } from "./use-admin-dashboard";

function AttentionList({ data }: { readonly data: DashboardData }) {
  const attentions = buildAttentions(data.overview, data.shows, data.loadedAt);
  return (
    <section aria-labelledby="attention-heading" className="rounded-card border border-border bg-card px-5 py-4">
      <h2 id="attention-heading" className="text-base font-bold text-foreground">확인할 것</h2>
      {attentions.length === 0 ? (
        <p className="mt-2 text-sm text-muted">지금 바로 확인할 항목이 없어요.</p>
      ) : (
        <ul className="mt-3 flex flex-col gap-2">
          {attentions.map((attention) => (
            <li key={attention.id}>
              <Link
                href={adminSectionHref(attention.section)}
                className={`flex min-h-11 items-center justify-between gap-3 rounded-control border px-4 py-2 text-sm font-semibold transition-colors ${
                  attention.tone === "warn"
                    ? "border-warn/30 bg-warn-bg text-foreground hover:border-warn"
                    : "border-brand-line bg-brand-soft text-foreground hover:border-brand"
                }`}
              >
                <span className="flex items-center gap-2">
                  <span
                    className={`shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-bold ${
                      attention.tone === "warn" ? "bg-warn text-white" : "bg-brand text-white"
                    }`}
                  >
                    {attention.tone === "warn" ? "처리 필요" : "참고"}
                  </span>
                  {attention.message}
                </span>
                <span aria-hidden className="shrink-0 text-muted-strong">→</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function AdminOverviewSection({ data }: { readonly data: DashboardData }) {
  const { overview, memberStats } = data;
  return (
    <>
      <AttentionList data={data} />

      <div className="grid gap-4 xl:grid-cols-3">
        <StatGroup title="회원" href={adminSectionHref("members")}>
          <StatTile label="배우" value={memberStats.applicants} unit="명" hint={`오늘 +${memberStats.today.applicants}`} />
          <StatTile
            label="기획사·제작사"
            value={memberStats.producers}
            unit="곳"
            hint={`인증 대기 ${overview.pendingProducers}`}
            emphasis={overview.pendingProducers > 0}
          />
          <StatTile
            label="최근 7일 가입"
            value={memberStats.lastWeek.applicants + memberStats.lastWeek.producers}
            unit="명"
            hint={`배우 ${memberStats.lastWeek.applicants} · 기획사 ${memberStats.lastWeek.producers}`}
          />
        </StatGroup>

        <StatGroup title="오디션" href={adminSectionHref("auditions")}>
          <StatTile
            label="공고"
            value={overview.auditions}
            unit="건"
            hint={`공개 ${overview.publishedAuditions} · 작성 중 ${overview.draftAuditions}`}
          />
          <StatTile
            label="지원서"
            value={overview.submissions}
            unit="건"
            hint={`최근 7일 +${overview.newSubmissionsInLastWeek}`}
          />
          <StatTile
            label="OTR 지원서"
            value={overview.otrSubmissions}
            unit="건"
            hint={`OTR 공고 ${overview.otrAuditions} · 7일 +${overview.newOtrSubmissionsInLastWeek}`}
          />
        </StatGroup>

        <StatGroup title="무료 공연" href={adminSectionHref("shows")}>
          <StatTile label="예매 중 공연" value={overview.openShows} unit="편" hint={`전체 ${overview.shows}편`} />
          <StatTile label="확정 예매 매수" value={overview.reservedTickets} unit="매" />
          <StatTile label="최근 7일 예매" value={overview.newReservationsInLastWeek} unit="건" hint="현재 확정 기준" />
        </StatGroup>
      </div>

      <AdminActivityCharts days={data.activity} />

      <p className="text-xs leading-5 text-muted">
        방문자·활성 사용자 수는 로그인·방문 기록을 저장하지 않아 이 화면에서 셀 수 없어요. 비회원 관객까지 포함한 방문 통계는
        Google Analytics(GA4)에서 확인해 주세요.
      </p>
    </>
  );
}

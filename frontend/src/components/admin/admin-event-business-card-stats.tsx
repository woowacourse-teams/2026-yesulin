"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AdminApiError, fetchEventBusinessCardVisitStats } from "@/features/admin/api";
import type { AdminEventBusinessCardVisitStats } from "@/features/admin/types";
import { formatActivityDay } from "./admin-activity-charts";
import { AdminActionButton } from "./admin-shell";

export function AdminEventBusinessCardStats({ eventId, onUnauthorized }: {
  readonly eventId: number;
  readonly onUnauthorized: () => void;
}) {
  const fieldId = useId();
  const [days, setDays] = useState(14);
  const [revision, setRevision] = useState(0);
  const [stats, setStats] = useState<AdminEventBusinessCardVisitStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const unauthorized = useRef(onUnauthorized);
  useEffect(() => { unauthorized.current = onUnauthorized; }, [onUnauthorized]);
  useEffect(() => {
    let active = true;
    fetchEventBusinessCardVisitStats(eventId, days).then((result) => {
      if (active) { setStats(result); setError(null); }
    }).catch((cause: unknown) => {
      if (!active) return;
      if (cause instanceof AdminApiError && cause.status === 401) { unauthorized.current(); return; }
      setError(cause instanceof Error ? cause.message : "통계를 불러오지 못했습니다.");
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [eventId, days, revision]);

  return <section aria-labelledby={`${fieldId}-heading`} className="min-w-0 overflow-hidden rounded-card border border-border bg-card">
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-border-soft px-5 py-5 sm:px-6">
      <div>
        <h3 id={`${fieldId}-heading`} className="text-base font-bold">명함 접속 기록</h3>
        <p className="mt-1 text-sm leading-6 text-muted-strong">이 이벤트에서 발급한 모든 명함의 접속 횟수를 합산합니다.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <label htmlFor={`${fieldId}-days`} className="sr-only">날짜별 조회</label>
        <select id={`${fieldId}-days`} value={days} onChange={(event) => { setLoading(true); setStats(null); setError(null); setDays(Number(event.target.value)); }} className="min-h-11 rounded-control border border-border bg-card px-3 text-sm font-medium">
          <option value={7}>최근 7일</option><option value={14}>최근 14일</option><option value={30}>최근 30일</option>
        </select>
        <AdminActionButton tone="quiet" disabled={loading} onClick={() => { setLoading(true); setRevision((current) => current + 1); }}>{loading ? "조회 중…" : "통계 새로고침"}</AdminActionButton>
      </div>
    </div>
    <div className="px-5 py-6 sm:px-6">
      {loading ? <div role="status" className="flex min-h-60 flex-col justify-center gap-4 text-sm text-muted">
        <div aria-hidden="true" className="h-10 w-24 rounded-control bg-surface motion-safe:animate-pulse" />
        접속 통계를 불러오는 중이에요.
      </div> : error ? <p role="alert" className="rounded-control bg-fail-bg px-4 py-4 text-sm leading-6 text-fail">{error}</p> : stats ? <VisitOverview stats={stats} /> : null}
    </div>
    <p className="border-t border-border-soft px-5 py-4 text-xs leading-5 text-muted sm:px-6">개인별 접속 내역은 기록하지 않습니다. 반복 접속·공유 주소·미리보기 봇이 포함될 수 있으며, 기능 적용 이후의 접속부터 집계합니다.</p>
  </section>;
}

function VisitOverview({ stats }: { readonly stats: AdminEventBusinessCardVisitStats }) {
  const total = stats.daily.reduce((sum, day) => sum + day.visits, 0);
  return <>
    <div className="flex flex-wrap items-end justify-between gap-3">
      <dl>
        <dt className="text-sm font-medium text-muted-strong">선택 기간 총 접속</dt>
        <dd className="num mt-2 text-4xl font-semibold tracking-tight">{total.toLocaleString("ko-KR")}<span className="ml-1.5 text-base font-medium text-muted">회</span></dd>
      </dl>
      <p className="num text-xs leading-5 text-muted">{stats.fromDate} ~ {stats.toDate}<span className="mt-1 block sm:text-right">한국 시간 기준</span></p>
    </div>
    <div className="mt-7">
      {total === 0 ? <div className="flex min-h-44 flex-col items-center justify-center rounded-control bg-surface px-5 py-6 text-center">
        <p className="text-sm font-semibold text-foreground">이 기간에는 명함 접속 기록이 없어요.</p>
        <p className="mt-2 max-w-sm text-xs leading-5 text-muted-strong">명함의 QR이나 프로필 링크를 통해 접속하면<br />이곳에서 날짜별 추이를 확인할 수 있어요.</p>
      </div> : <DailyVisitChart daily={stats.daily} />}
    </div>
    <details className="group mt-5 border-t border-border-soft">
      <summary className="flex min-h-12 cursor-pointer list-none flex-wrap items-center justify-between gap-2 py-3 text-sm font-semibold text-muted-strong hover:text-foreground [&::-webkit-details-marker]:hidden">
        <span>날짜별 기록 <span className="num ml-1 font-normal text-muted">{stats.daily.length}일</span></span>
        <span className="text-xs font-medium"><span className="group-open:hidden">펼치기 +</span><span className="hidden group-open:inline">접기 −</span></span>
      </summary>
      <div className="max-h-72 overflow-auto rounded-control border border-border-soft">
        <table className="num w-full text-right text-sm">
          <caption className="sr-only">{stats.fromDate} ~ {stats.toDate} 날짜별 명함 접속 횟수</caption>
          <thead className="sticky top-0 bg-surface text-xs text-muted-strong"><tr><th scope="col" className="px-4 py-3 text-left">날짜</th><th scope="col" className="px-4 py-3">총 접속 횟수</th></tr></thead>
          <tbody>{[...stats.daily].reverse().map((day) => <tr key={day.date} className="border-t border-border-soft hover:bg-surface/60">
            <th scope="row" className="px-4 py-2.5 text-left font-normal">{formatActivityDay(day.date)}</th>
            <td className={`px-4 py-2.5 ${day.visits === 0 ? "text-muted" : "font-semibold text-foreground"}`}>{day.visits.toLocaleString("ko-KR")}회</td>
          </tr>)}</tbody>
        </table>
      </div>
    </details>
  </>;
}

function DailyVisitChart({ daily }: { readonly daily: AdminEventBusinessCardVisitStats["daily"] }) {
  const ceiling = Math.ceil(Math.max(1, ...daily.map((day) => day.visits)) / 4) * 4;
  const step = 584 / daily.length;
  const labelDays = [daily[0], daily[Math.floor(daily.length / 2)], daily[daily.length - 1]];
  return <figure aria-label="일별 명함 접속 추이">
    <figcaption className="mb-3 flex justify-between text-xs text-muted-strong"><span>일별 접속 추이</span><span>단위: 회</span></figcaption>
    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-3">
      <div aria-hidden="true" className="num flex h-40 flex-col justify-between text-right text-[11px] leading-none text-muted">
        {[4, 3, 2, 1, 0].map((tick) => <span key={tick}>{(ceiling * tick / 4).toLocaleString("ko-KR")}</span>)}
      </div>
      <div className="min-w-0">
        <svg viewBox="0 0 584 128" preserveAspectRatio="none" role="img" aria-label={`일별 명함 접속 횟수. 최대 ${Math.max(...daily.map((day) => day.visits)).toLocaleString("ko-KR")}회. 정확한 수치는 아래 날짜별 기록에서 확인할 수 있습니다.`} className="block h-40 w-full overflow-visible">
          {[0, 1, 2, 3, 4].map((tick) => <line key={tick} x1={0} x2={584} y1={tick * 32} y2={tick * 32} className="stroke-border-soft" />)}
          {daily.map((day, index) => <rect key={day.date} x={step * index + step * .2} y={128 - day.visits / ceiling * 128} width={step * .6} height={day.visits / ceiling * 128} rx={2} className="fill-brand hover:fill-brand-strong">
            <title>{formatActivityDay(day.date)} · {day.visits.toLocaleString("ko-KR")}회</title>
          </rect>)}
        </svg>
        <div aria-hidden="true" className="num mt-3 flex justify-between text-[11px] text-muted">
          {labelDays.map((day, index) => <span key={index}>{Number(day.date.slice(5, 7))}/{Number(day.date.slice(8))}</span>)}
        </div>
      </div>
    </div>
  </figure>;
}

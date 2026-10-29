"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AdminApiError, fetchEventBusinessCardVisitStats } from "@/features/admin/api";
import type { AdminEventBusinessCardVisitStats } from "@/features/admin/types";
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

  return <section aria-labelledby={`${fieldId}-heading`} className="mt-4 rounded-control border border-border-soft bg-surface p-3">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h4 id={`${fieldId}-heading`} className="font-semibold">명함 날짜별 총 접속</h4>
      <AdminActionButton tone="quiet" disabled={loading} onClick={() => { setLoading(true); setRevision((current) => current + 1); }}>{loading ? "조회 중…" : "통계 새로고침"}</AdminActionButton>
    </div>
    <p className="mt-2 text-xs text-muted-strong">이 이벤트에서 발급한 모든 명함의 접속 횟수를 합산합니다.</p>
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <label htmlFor={`${fieldId}-days`} className="text-xs font-semibold">날짜별 조회</label>
      <select id={`${fieldId}-days`} value={days} onChange={(event) => { setLoading(true); setStats(null); setError(null); setDays(Number(event.target.value)); }} className="min-h-11 rounded-control border border-border bg-card px-2 text-sm">
        <option value={7}>최근 7일</option><option value={14}>최근 14일</option><option value={30}>최근 30일</option>
      </select>
      <span className="text-xs text-muted">한국 시간 기준</span>
    </div>
    {loading ? <p role="status" className="mt-3 text-xs text-muted">접속 통계를 불러오는 중이에요.</p> : null}
    {error ? <p role="alert" className="mt-3 text-sm text-fail">{error}</p> : null}
    {stats && !error ? <div className="mt-3 overflow-x-auto">
      <table className="num w-full text-right text-xs">
        <caption className="mb-2 text-left text-muted">{stats.fromDate} ~ {stats.toDate}</caption>
        <thead><tr className="border-b border-border text-muted-strong"><th scope="col" className="py-2 text-left">날짜</th><th scope="col">총 접속 횟수</th></tr></thead>
        <tbody>{[...stats.daily].reverse().map((day) => <tr key={day.date} className="border-b border-border-soft">
          <th scope="row" className="py-2 text-left font-normal">{day.date}</th><td>{day.visits.toLocaleString("ko-KR")}회</td>
        </tr>)}</tbody>
      </table>
    </div> : null}
    <p className="mt-3 text-xs leading-5 text-muted">개인별 접속 내역은 기록하지 않습니다. 반복 접속·공유 주소·미리보기 봇이 포함될 수 있으며, 기능 적용 이후의 접속부터 집계합니다.</p>
  </section>;
}

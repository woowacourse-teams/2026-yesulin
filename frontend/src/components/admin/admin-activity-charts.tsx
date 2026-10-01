"use client";

import { useState } from "react";
import { sumActivity } from "@/features/admin/insights";
import type { AdminDailyActivity } from "@/features/admin/types";
import { formatCount } from "./admin-stat";

type ChartSpec = {
  readonly id: string;
  readonly title: string;
  readonly unit: string;
  readonly value: (day: AdminDailyActivity) => number;
  readonly detail: (day: AdminDailyActivity) => string;
};

const CHARTS: readonly ChartSpec[] = [
  {
    id: "signups",
    title: "신규 가입",
    unit: "명",
    value: (day) => day.applicantSignups + day.producerSignups,
    detail: (day) => `배우 ${day.applicantSignups}명 · 기획사 ${day.producerSignups}명`,
  },
  {
    id: "submissions",
    title: "지원서 제출",
    unit: "건",
    value: (day) => day.submissions + day.otrSubmissions,
    detail: (day) => `일반 ${day.submissions}건 · OTR ${day.otrSubmissions}건`,
  },
  {
    id: "reservations",
    title: "무료 공연 예매",
    unit: "매",
    value: (day) => day.reservedTickets,
    detail: (day) => `${day.reservations}건 · ${day.reservedTickets}매`,
  },
];

const DAY_FORMAT = new Intl.DateTimeFormat("ko-KR", {
  month: "numeric",
  day: "numeric",
  weekday: "short",
  timeZone: "Asia/Seoul",
});
const SHORT_DAY_FORMAT = new Intl.DateTimeFormat("ko-KR", {
  month: "numeric",
  day: "numeric",
  timeZone: "Asia/Seoul",
});

/** 서버는 한국 날짜(`2026-09-30`)를 준다. 한국 자정으로 읽어야 브라우저 시간대와 관계없이 같은 날짜가 된다. */
function koreanDate(date: string): Date {
  return new Date(`${date}T00:00:00+09:00`);
}

export function formatActivityDay(date: string): string {
  return DAY_FORMAT.format(koreanDate(date));
}

function ActivityChart({ spec, days }: { readonly spec: ChartSpec; readonly days: readonly AdminDailyActivity[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const values = days.map(spec.value);
  const max = Math.max(0, ...values);
  const total = sumActivity(days, spec.value);
  const peakIndex = values.indexOf(max);
  const summary = max === 0
    ? `최근 ${days.length}일 ${spec.title} 없음`
    : `최근 ${days.length}일 ${spec.title} 합계 ${total}${spec.unit}, 가장 많은 날 ${formatActivityDay(days[peakIndex].date)} ${max}${spec.unit}`;
  const hoveredDay = hovered === null ? null : days[hovered];
  const tooltipAlign = hovered === null ? "" : hovered < 2 ? "translate-x-0" : hovered > days.length - 3 ? "-translate-x-full" : "-translate-x-1/2";

  return (
    <figure className="flex min-w-0 flex-col rounded-card border border-border bg-card px-5 py-4">
      <figcaption className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-bold text-foreground">{spec.title}</span>
        <span className="text-xs text-muted">
          14일 합계 <span className="num text-base font-bold text-foreground">{formatCount(total)}</span>{spec.unit}
        </span>
      </figcaption>
      <div className="relative mt-4">
        <span className="num absolute -top-1 left-0 -translate-y-full text-[11px] text-muted">
          {max > 0 ? `최대 ${max}` : ""}
        </span>
        <div
          role="img"
          aria-label={summary}
          className="flex h-28 items-end gap-0.5 border-b border-border"
          onMouseLeave={() => setHovered(null)}
        >
          {days.map((day, index) => {
            const value = values[index];
            const active = hovered === index;
            return (
              <div
                key={day.date}
                onMouseEnter={() => setHovered(index)}
                className={`flex h-full flex-1 items-end justify-center rounded-t-[4px] ${active ? "bg-brand-soft" : ""}`}
              >
                {value > 0 ? (
                  <span
                    className={`block w-full max-w-6 rounded-t-[4px] ${active ? "bg-brand-strong" : "bg-brand"}`}
                    style={{ height: `${Math.max(4, (value / max) * 100)}%` }}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
        {hoveredDay && hovered !== null ? (
          <div
            role="presentation"
            className={`pointer-events-none absolute top-0 z-10 -translate-y-[calc(100%+6px)] whitespace-nowrap rounded-control bg-foreground px-3 py-2 text-xs text-white shadow-[var(--shadow-tooltip)] ${tooltipAlign}`}
            style={{ left: `${((hovered + 0.5) / days.length) * 100}%` }}
          >
            <span className="block font-semibold">{formatActivityDay(hoveredDay.date)}</span>
            <span className="num block text-white/80">{spec.detail(hoveredDay)}</span>
          </div>
        ) : null}
        <div className="mt-1.5 flex justify-between text-[11px] text-muted" aria-hidden>
          <span>{days.length > 0 ? SHORT_DAY_FORMAT.format(koreanDate(days[0].date)) : ""}</span>
          <span>오늘</span>
        </div>
      </div>
    </figure>
  );
}

/** 차트 값을 모두 확인할 수 있는 표 보기다. 마우스 없이도 같은 숫자를 읽을 수 있게 한다. */
function ActivityTable({ days }: { readonly days: readonly AdminDailyActivity[] }) {
  return (
    <details className="rounded-card border border-border bg-card">
      <summary className="flex min-h-11 cursor-pointer items-center px-5 text-sm font-semibold text-muted-strong hover:text-foreground">
        날짜별 숫자 표로 보기
      </summary>
      <div className="overflow-x-auto border-t border-border-soft">
        <table className="w-full min-w-[40rem] text-left text-sm">
          <caption className="sr-only">최근 14일 날짜별 활동</caption>
          <thead className="bg-surface text-xs text-muted">
            <tr>
              {["날짜", "배우 가입", "기획사 가입", "지원서", "OTR 지원서", "예매 건수", "예매 매수"].map((header) => (
                <th key={header} scope="col" className="px-4 py-2 font-semibold">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...days].reverse().map((day) => (
              <tr key={day.date} className="border-t border-border-soft">
                <th scope="row" className="px-4 py-2 font-medium text-foreground">{formatActivityDay(day.date)}</th>
                {[
                  day.applicantSignups,
                  day.producerSignups,
                  day.submissions,
                  day.otrSubmissions,
                  day.reservations,
                  day.reservedTickets,
                ].map((value, index) => (
                  <td key={index} className={`num px-4 py-2 ${value === 0 ? "text-muted-soft" : "text-muted-strong"}`}>
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export function AdminActivityCharts({ days }: { readonly days: readonly AdminDailyActivity[] }) {
  return (
    <section aria-labelledby="activity-heading" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="activity-heading" className="text-base font-bold text-foreground">최근 14일 활동</h2>
        <p className="text-xs text-muted">한국 시간 기준 · 날짜별 숫자는 막대에 마우스를 올리거나 아래 표에서 볼 수 있어요</p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {CHARTS.map((spec) => <ActivityChart key={spec.id} spec={spec} days={days} />)}
      </div>
      <ActivityTable days={days} />
    </section>
  );
}

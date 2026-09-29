import Link from "next/link";
import type { SessionAvailability, ShowAvailability } from "@/features/shows/format";
import { SHOW_GENRE_LABELS, showRoutes, type ShowGenre, type ShowStatus } from "@/features/shows/types";

const SHOW_AVAILABILITY_BADGE: Record<ShowAvailability["kind"], { readonly symbol: string; readonly tone: string }> = {
  open: { symbol: "●", tone: "border-brand-line bg-brand-soft text-brand" },
  soldOut: { symbol: "×", tone: "border-fail/30 bg-card text-fail" },
  preparing: { symbol: "○", tone: "border-border bg-surface text-muted-strong" },
  ended: { symbol: "−", tone: "border-border bg-surface text-muted-strong" },
  closed: { symbol: "−", tone: "border-border bg-surface text-muted-strong" },
};

export function ShowStatusBadge({ availability }: { readonly availability: ShowAvailability }) {
  const { symbol, tone } = SHOW_AVAILABILITY_BADGE[availability.kind];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${tone}`}>
      <span aria-hidden="true">{symbol}</span>
      {availability.label}
    </span>
  );
}

const MANAGEMENT_STATUS = {
  DRAFT: { label: "공개 전", tone: "border-border bg-border-soft text-muted-strong" },
  OPEN: { label: "예매 중", tone: "border-brand bg-brand text-white" },
  CLOSED: { label: "예매 종료", tone: "border-foreground bg-foreground text-white" },
} as const satisfies Record<ShowStatus, { label: string; tone: string }>;

/** 기획사 화면의 공연 상태. 관객 화면에 없는 "공개 전"까지 문구로 구분한다. */
export function ManagementStatusBadge({ status }: { readonly status: ShowStatus }) {
  const { label, tone } = MANAGEMENT_STATUS[status];
  return (
    <span className={`inline-flex h-6 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 text-xs font-bold ${tone}`}>
      <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {label}
    </span>
  );
}

export function ManagementGenreBadge({ genre }: { readonly genre: ShowGenre }) {
  return (
    <span className="inline-flex min-h-8 items-center whitespace-nowrap rounded-full border border-border bg-surface px-3 text-base font-semibold text-muted-strong">
      {SHOW_GENRE_LABELS[genre]}
    </span>
  );
}

export function ShowGenreBadge({ genre }: { readonly genre: ShowGenre }) {
  return (
    <span className="inline-flex items-center rounded-full border border-border bg-card px-3 py-1 text-sm font-semibold text-muted-strong">
      {SHOW_GENRE_LABELS[genre]}
    </span>
  );
}

const AVAILABILITY_TONE: Record<SessionAvailability["kind"], string> = {
  available: "text-muted-strong",
  few: "text-foreground",
  soldOut: "text-fail",
  closed: "text-muted",
};

/** 잔여석이 적을 때 경고색은 점에만 쓰고 글자는 본문색으로 둬 대비를 지킨다. */
export function SessionAvailabilityText({ availability }: { readonly availability: SessionAvailability }) {
  return (
    <span className={`num whitespace-nowrap text-sm font-semibold ${AVAILABILITY_TONE[availability.kind]}`}>
      {availability.kind === "few" ? <span aria-hidden="true" className="mr-1 text-warn">●</span> : null}
      {availability.label}
    </span>
  );
}

export function ShowUnavailable() {
  return (
    <main className="min-h-screen break-keep bg-surface px-5 py-16 wrap-break-word sm:px-8">
      <section className="mx-auto max-w-[680px] rounded-card border border-border bg-card px-6 py-14 text-center">
        <p className="text-sm font-semibold text-fail">공연을 찾을 수 없어요</p>
        <h1 className="mt-3 text-2xl font-bold tracking-[-0.025em]">공연 링크가 올바른지 확인해 주세요.</h1>
        <p className="mt-3 text-muted-strong">공연이 내려갔거나 주소가 올바르지 않을 수 있어요.</p>
        <Link
          href={showRoutes.list}
          className="mt-7 inline-flex min-h-11 items-center justify-center rounded-control bg-brand px-5 font-semibold text-white transition-colors hover:bg-brand-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          다른 공연 보기
        </Link>
      </section>
    </main>
  );
}

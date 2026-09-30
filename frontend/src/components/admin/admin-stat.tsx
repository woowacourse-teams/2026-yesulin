import Link from "next/link";
import type { ReactNode } from "react";

const NUMBER_FORMAT = new Intl.NumberFormat("ko-KR");

export function formatCount(value: number): string {
  return NUMBER_FORMAT.format(value);
}

type GroupProps = {
  readonly title: string;
  readonly href?: string;
  readonly linkLabel?: string;
  readonly children: ReactNode;
};

/** 같은 영역의 숫자를 한 카드로 묶는다. 영역 화면으로 가는 링크를 머리에 둔다. */
export function StatGroup({ title, href, linkLabel = "자세히", children }: GroupProps) {
  return (
    <section className="flex flex-col rounded-card border border-border bg-card">
      <header className="flex items-center justify-between gap-2 border-b border-border-soft px-5 py-3">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        {href ? (
          <Link href={href} className="inline-flex min-h-9 items-center text-sm font-semibold text-brand hover:underline">
            {linkLabel}
            <span aria-hidden className="ml-0.5">→</span>
            <span className="sr-only"> {title}</span>
          </Link>
        ) : null}
      </header>
      <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-5 px-5 py-4 sm:grid-cols-3">{children}</dl>
    </section>
  );
}

type TileProps = {
  readonly label: string;
  readonly value: number;
  readonly unit?: string;
  readonly hint?: string;
  readonly emphasis?: boolean;
};

export function StatTile({ label, value, unit, hint, emphasis = false }: TileProps) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className="mt-1">
        <span className={`num text-2xl font-bold tracking-[-0.02em] ${emphasis ? "text-warn" : "text-foreground"}`}>
          {formatCount(value)}
        </span>
        {unit ? <span className="ml-0.5 text-sm font-semibold text-muted-strong">{unit}</span> : null}
        {hint ? <span className="mt-1 block text-xs text-muted">{hint}</span> : null}
      </dd>
    </div>
  );
}

/** 섹션 머리의 요약 숫자다. 표 위에 한 줄로 핵심 숫자만 놓는다. */
export function SummaryStrip({ children }: { readonly children: ReactNode }) {
  return (
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{children}</dl>
  );
}

export function SummaryItem({ label, value, unit, hint, emphasis = false }: TileProps) {
  return (
    <div className="rounded-card border border-border bg-card px-4 py-3">
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className="mt-1">
        <span className={`num text-xl font-bold ${emphasis ? "text-warn" : "text-foreground"}`}>{formatCount(value)}</span>
        {unit ? <span className="ml-0.5 text-sm font-semibold text-muted-strong">{unit}</span> : null}
        {hint ? <span className="mt-0.5 block text-xs text-muted">{hint}</span> : null}
      </dd>
    </div>
  );
}

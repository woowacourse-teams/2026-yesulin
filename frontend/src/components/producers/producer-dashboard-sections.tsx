import Link from "next/link";
import { PiArrowRight, PiFileText, PiTray } from "react-icons/pi";
import type { IconType } from "react-icons";
import { SecondaryButton, SecondaryLink } from "@/components/ui/controls";
import type { DashboardRow } from "@/features/producer-dashboard/activity";
import { formatShowDate, toKstDateTimeInput } from "@/features/shows/format";

export type DashboardSource = {
  readonly label: string;
  readonly loading: boolean;
  readonly error: string | null;
  readonly reload: () => void;
};

type DashboardMetricProps = {
  readonly source: DashboardSource;
  readonly count: number | undefined;
  readonly unit: string;
  readonly href: string;
  readonly icon: IconType;
};

export function DashboardMetric({ source, count, unit, href, icon: Icon }: DashboardMetricProps) {
  return (
    <div className="min-w-0 rounded-card border border-border bg-card">
      <Link href={href} className="grid min-h-24 gap-1 rounded-card px-2.5 py-3 hover:bg-brand-soft sm:min-h-27 sm:px-5 sm:py-4">
        <span className="flex min-h-8 items-center gap-2 break-keep text-xs font-semibold text-muted-strong sm:min-h-0 sm:text-sm">
          <Icon aria-hidden="true" className="hidden size-[18px] shrink-0 text-brand-pressed sm:block" />{source.label}
        </span>
        <span className="flex min-w-0 items-end justify-between gap-1">
          <MetricValue source={source} count={count} unit={unit} />
          <PiArrowRight aria-hidden="true" className="mb-1 hidden shrink-0 text-muted sm:block" />
        </span>
      </Link>
      {source.error && <RetrySource source={source} />}
    </div>
  );
}

function MetricValue({ source, count, unit }: Pick<DashboardMetricProps, "source" | "count" | "unit">) {
  if (count === undefined) {
    let label = "불러오는 중";
    if (source.error) label = "조회 실패";
    return <span role="status" className="break-keep text-xs font-semibold text-muted-strong sm:text-sm">{label}</span>;
  }
  return <strong className="num flex items-baseline gap-1 text-2xl leading-none font-bold tracking-tight sm:text-[31px]">{count}<span className="text-xs font-semibold text-muted-strong">{unit}</span></strong>;
}

function RetrySource({ source }: { readonly source: DashboardSource }) {
  return (
    <div className="flex items-center justify-end px-2.5 pb-2">
      <SecondaryButton className="px-2 text-xs" aria-label={`${source.label} 다시 시도`} onClick={source.reload}>다시 시도</SecondaryButton>
    </div>
  );
}

type DashboardListProps = {
  readonly rows: readonly DashboardRow[];
  readonly sources: readonly DashboardSource[];
  readonly emptyTitle: string;
  readonly emptyDescription: string;
};

export function DashboardList({ rows, sources, emptyTitle, emptyDescription }: DashboardListProps) {
  const failures = sources.filter((source) => source.error);
  const loading = sources.some((source) => source.loading);
  return (
    <div className="min-w-0 px-4 sm:px-5">
      {rows.length > 0 && <ul className="divide-y divide-border-soft py-1">{rows.map((row) => <DashboardListRow key={row.key} row={row} />)}</ul>}
      {loading && <p role="status" className="py-4 text-sm text-muted-strong">불러오는 중이에요.</p>}
      {failures.map((source) => <ListFailure key={source.label} source={source} />)}
      {rows.length === 0 && !loading && failures.length === 0 && <EmptyList title={emptyTitle} description={emptyDescription} />}
    </div>
  );
}

function ListFailure({ source }: { readonly source: DashboardSource }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t border-border-soft py-2">
      <p role="status" className="text-sm text-muted-strong">{source.label} 조회에 실패했어요.</p>
      <SecondaryButton className="px-2 text-xs" aria-label={`${source.label} 다시 시도`} onClick={source.reload}>다시 시도</SecondaryButton>
    </div>
  );
}

function EmptyList({ title, description }: { readonly title: string; readonly description: string }) {
  return <div className="grid min-h-26 content-center gap-1 py-5"><strong className="text-sm">{title}</strong><p className="text-sm text-muted-strong">{description}</p></div>;
}

function DashboardListRow({ row }: { readonly row: DashboardRow }) {
  return (
    <li className="grid min-h-18 grid-cols-[42px_minmax(0,1fr)] items-center gap-x-2.5 gap-y-1.5 py-2.5 min-[360px]:grid-cols-[42px_minmax(0,1fr)_auto] sm:grid-cols-[48px_minmax(0,1fr)_auto] sm:gap-x-3">
      <RowMarker row={row} />
      <div className="min-w-0 break-keep wrap-break-word"><strong className="block text-sm leading-snug">{row.title}</strong><RowDetail row={row} /></div>
      <SecondaryLink href={row.href} aria-label={`${row.title} ${row.action}`} className="col-start-2 justify-self-start px-2 text-xs min-[360px]:col-start-auto min-[360px]:justify-self-end sm:gap-2 sm:px-3">
        {row.action}<PiArrowRight aria-hidden="true" className="hidden shrink-0 sm:block" />
      </SecondaryLink>
    </li>
  );
}

function RowMarker({ row }: { readonly row: DashboardRow }) {
  if (row.kind === "show" || row.kind === "deadline") return <DateTile row={row} />;
  let Icon = PiFileText;
  if (row.kind === "pdf") Icon = PiTray;
  return <span className="grid size-10 place-items-center rounded-control bg-surface text-muted-strong sm:size-11"><Icon aria-hidden="true" className="size-[18px]" /></span>;
}

function DateTile({ row }: { readonly row: DashboardRow }) {
  const [, month, day] = toKstDateTimeInput(new Date(row.at).toISOString()).slice(0, 10).split("-");
  let tone = "border-border bg-surface text-foreground";
  if (row.kind === "deadline") tone = "border-brand-line bg-brand-soft text-brand-pressed";
  return (
    <time dateTime={row.dateTime} className={`num grid h-12 place-content-center justify-items-center rounded-control border leading-none ${tone}`}>
      <span className="text-[11px] font-semibold">{Number(month)}월</span>{" "}
      <strong className="mt-1 text-xl">{Number(day)}<span className="sr-only">일</span></strong>
    </time>
  );
}

function RowDetail({ row }: { readonly row: DashboardRow }) {
  return (
    <p className="num mt-1 text-xs text-muted-strong">
      {row.detail}
      {row.kind === "post" && <>, <time dateTime={row.dateTime}>{formatShowDate(row.dateTime)}</time> 업데이트</>}
    </p>
  );
}

import type { AdminLog, AdminLogEntry, AdminLogLevel } from "@/features/admin/types";
import {
  filterLogEntries,
  isSlowHttpRequest,
  logElapsedMs,
  logEvent,
  logSummary,
  shortRequestId,
  type AdminLogFilters,
} from "@/features/admin/log-view";

type Props = {
  readonly log: AdminLog;
  readonly filters: AdminLogFilters;
};

const LOG_TIME_FORMAT = new Intl.DateTimeFormat("ko-KR", {
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
  timeZone: "Asia/Seoul",
});

const LEVEL_STYLES: Record<AdminLogLevel, string> = {
  TRACE: "bg-neutral-100 text-neutral-500",
  DEBUG: "bg-neutral-100 text-neutral-600",
  INFO: "bg-blue-50 text-blue-700",
  WARN: "bg-warn-bg text-warn",
  ERROR: "bg-fail-bg text-fail",
};

function formatLogTime(value: string | null): string {
  if (!value) return "시각 없음";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "시각 없음" : LOG_TIME_FORMAT.format(parsed);
}

function formatElapsed(value: number | null): string {
  if (value === null) return "-";
  return value >= 1000 ? `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 2)}s` : `${value}ms`;
}

function displayValue(value: unknown): string {
  if (value === null) return "null";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  try {
    return JSON.stringify(value, null, 2) ?? "표시할 수 없는 값";
  } catch {
    return "표시할 수 없는 값";
  }
}

function LevelBadge({ level }: { readonly level: AdminLogLevel | null }) {
  if (!level) return <span className="text-xs text-muted">UNKNOWN</span>;
  return (
    <span className={`inline-flex w-fit rounded-full px-2 py-0.5 text-[11px] font-bold ${LEVEL_STYLES[level]}`}>
      {level}
    </span>
  );
}

function Field({ label, value, mono = false }: {
  readonly label: string;
  readonly value: unknown;
  readonly mono?: boolean;
}) {
  return (
    <div className="grid gap-1 border-b border-border-soft py-2 last:border-b-0 sm:grid-cols-[140px_minmax(0,1fr)]">
      <dt className="text-xs font-semibold text-muted">{label}</dt>
      <dd className={`min-w-0 whitespace-pre-wrap break-all text-xs text-foreground ${mono ? "font-mono" : ""}`}>
        {displayValue(value)}
      </dd>
    </div>
  );
}

function LogDetail({ entry }: { readonly entry: AdminLogEntry }) {
  const stackTrace = entry.attributes.stack_trace ?? entry.attributes.stackTrace;
  const attributes = Object.entries(entry.attributes)
    .filter(([key]) => key !== "stack_trace" && key !== "stackTrace");

  return (
    <div className="border-t border-border bg-surface px-4 py-4 sm:px-5">
      <dl className="rounded-control border border-border bg-card px-3 sm:px-4">
        <Field label="format" value={entry.format} mono />
        <Field label="timestamp" value={entry.timestamp ?? "-"} mono />
        <Field label="level" value={entry.level ?? "-"} mono />
        <Field label="logger" value={entry.logger ?? "-"} mono />
        <Field label="thread" value={entry.thread ?? "-"} mono />
        <Field label="requestId" value={entry.requestId ?? "-"} mono />
        <Field label="message" value={entry.message ?? "-"} />
        {attributes.map(([key, value]) => <Field key={key} label={key} value={value} mono />)}
      </dl>

      {stackTrace !== undefined ? (
        <section className="mt-4" aria-label="Stack trace">
          <h3 className="text-xs font-bold uppercase tracking-wide text-fail">Stack trace</h3>
          <pre className="mt-2 max-h-80 overflow-auto rounded-control bg-neutral-950 p-4 text-[11px] leading-5 text-neutral-100">
            <code>{displayValue(stackTrace)}</code>
          </pre>
        </section>
      ) : null}

      <details className="mt-4">
        <summary className="w-fit cursor-pointer text-xs font-semibold text-muted-strong hover:text-foreground">
          원본 로그 보기
        </summary>
        <pre className="mt-2 max-h-64 overflow-auto rounded-control bg-neutral-950 p-4 text-[11px] leading-5 text-neutral-100">
          <code>{entry.raw}</code>
        </pre>
      </details>
    </div>
  );
}

function LogRow({ entry, index }: { readonly entry: AdminLogEntry; readonly index: number }) {
  const event = logEvent(entry);
  const elapsedMs = logElapsedMs(entry);
  return (
    <details className="group border-b border-border last:border-b-0">
      <summary className="grid cursor-pointer list-none grid-cols-2 gap-x-4 gap-y-3 px-4 py-3 hover:bg-surface focus-visible:bg-brand-soft [&::-webkit-details-marker]:hidden lg:grid-cols-[150px_72px_140px_minmax(240px,1fr)_90px_110px] lg:items-center lg:px-5">
        <div className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted lg:hidden">시각</span>
          <span className="num block truncate text-xs text-muted-strong">{formatLogTime(entry.timestamp)}</span>
        </div>
        <div>
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted lg:hidden">레벨</span>
          <LevelBadge level={entry.level} />
        </div>
        <div className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted lg:hidden">이벤트</span>
          <span className="block truncate font-mono text-xs font-semibold text-muted-strong">{event}</span>
        </div>
        <div className="min-w-0 lg:col-start-5 lg:row-start-1">
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted lg:hidden">처리 시간</span>
          <span className={`num text-xs font-semibold ${isSlowHttpRequest(entry) ? "text-warn" : "text-muted-strong"}`}>
            {formatElapsed(elapsedMs)}
          </span>
        </div>
        <div className="col-span-2 min-w-0 lg:col-span-1 lg:col-start-4 lg:row-start-1">
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted lg:hidden">요약</span>
          <span className="flex min-w-0 items-start gap-2 text-sm text-foreground">
            <span aria-hidden="true" className="mt-0.5 shrink-0 text-muted transition-transform group-open:rotate-90">›</span>
            <span className="min-w-0 break-words">{logSummary(entry)}</span>
          </span>
        </div>
        <div className="col-span-2 min-w-0 lg:col-span-1 lg:col-start-6 lg:row-start-1">
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-muted lg:hidden">requestId</span>
          <span title={entry.requestId ?? undefined} className="block truncate font-mono text-xs text-muted-strong">
            {shortRequestId(entry.requestId)}
          </span>
        </div>
      </summary>
      <LogDetail entry={entry} />
      <span className="sr-only">로그 항목 {index + 1}</span>
    </details>
  );
}

export function AdminLogLines({ log, filters }: Props) {
  if (!log.available) {
    return (
      <p className="rounded-control border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        로그 파일을 읽을 수 없습니다. 서버의 <code>logging.file.name</code> 설정과 파일 권한을 확인하세요.
      </p>
    );
  }

  const filteredEntries = filterLogEntries(log.entries, filters);
  if (filteredEntries.length === 0) {
    const filtering = filters.errorsOnly || filters.slowRequestsOnly || filters.requestId || filters.keyword;
    return (
      <p className="rounded-card border border-border bg-card px-4 py-10 text-center text-sm text-muted">
        {filtering ? "현재 검색·필터 조건과 일치하는 로그가 없습니다." : "로그가 비어 있습니다."}
      </p>
    );
  }

  const newestFirst = [...filteredEntries].reverse();
  return (
    <section aria-label="애플리케이션 로그 목록" className="overflow-hidden rounded-card border border-border bg-card">
      <div className="hidden grid-cols-[150px_72px_140px_minmax(240px,1fr)_90px_110px] gap-4 border-b border-border bg-surface px-5 py-2 text-[11px] font-bold uppercase tracking-wide text-muted lg:grid">
        <span>시각</span>
        <span>레벨</span>
        <span>이벤트</span>
        <span>요약</span>
        <span>처리 시간</span>
        <span>requestId</span>
      </div>
      {newestFirst.map((entry, index) => (
        <LogRow key={`${entry.timestamp ?? "unknown"}-${entry.requestId ?? "none"}-${index}`} entry={entry} index={index} />
      ))}
    </section>
  );
}

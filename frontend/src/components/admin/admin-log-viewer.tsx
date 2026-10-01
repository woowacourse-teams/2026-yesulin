"use client";

import { useState } from "react";
import { LOG_LINE_LIMITS } from "@/features/admin/api";
import { LOG_RETENTION_DAYS, recentLogDates } from "@/features/admin/log-dates";
import type { AdminLogFilters } from "@/features/admin/log-view";
import type { AdminLogLevel } from "@/features/admin/types";
import { logout } from "@/features/auth/session-api";
import { AdminLoginForm } from "./admin-login-form";
import { AdminLogLines } from "./admin-log-lines";
import { AdminActionButton, AdminShell } from "./admin-shell";
import { formatTime } from "./admin-format";
import { REFRESH_INTERVAL_MS, useAdminLogs } from "./use-admin-logs";
import { useDebouncedValue } from "./use-debounced-value";

const SEARCH_DEBOUNCE_MS = 400;

const LOG_LEVELS: readonly AdminLogLevel[] = ["ERROR", "WARN", "INFO", "DEBUG", "TRACE"];

const LOG_LEVEL_STYLES: Record<AdminLogLevel, string> = {
  ERROR: "border-fail bg-fail-bg text-fail",
  WARN: "border-warn bg-warn-bg text-warn",
  INFO: "border-brand-line bg-brand-soft text-brand",
  DEBUG: "border-border bg-surface text-muted-strong",
  TRACE: "border-border bg-surface text-muted",
};

export function AdminLogViewer() {
  const [keywordInput, setKeywordInput] = useState("");
  const [requestIdInput, setRequestIdInput] = useState("");
  const [levels, setLevels] = useState<readonly AdminLogLevel[]>([]);
  const [slowRequestsOnly, setSlowRequestsOnly] = useState(false);
  const [limit, setLimit] = useState<number>(200);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [date, setDate] = useState<string | null>(null);
  // 날짜 목록은 화면을 연 시점의 한국 날짜로 만든다. 자정을 넘기면 새로고침으로 다시 만든다.
  const [dateOptions] = useState(() => recentLogDates(Date.now()));
  const keyword = useDebouncedValue(keywordInput.trim(), SEARCH_DEBOUNCE_MS);
  const { phase, data, error, refresh, restart, signOut } = useAdminLogs(keyword, limit, autoRefresh, date);
  const pastDate = date !== null;
  const filters: AdminLogFilters = {
    levels,
    slowRequestsOnly,
    requestId: requestIdInput,
    keyword,
  };

  function resetFilters() {
    setKeywordInput("");
    setRequestIdInput("");
    setLevels([]);
    setSlowRequestsOnly(false);
  }

  function toggleLevel(level: AdminLogLevel) {
    setLevels((selected) => (
      selected.includes(level)
        ? selected.filter((value) => value !== level)
        : [...selected, level]
    ));
  }

  async function handleLogout() {
    await logout().catch(() => null);
    signOut();
  }

  if (phase === "unauthorized") {
    return <AdminLoginForm onSuccess={restart} />;
  }

  return (
    <AdminShell
      current="logs"
      title="애플리케이션 로그"
      description="최신 로그부터 보여 줘요. 행을 펼치면 전체 필드와 stack trace를 확인할 수 있어요."
      actions={(
        <>
          <AdminActionButton onClick={refresh}>새로고침</AdminActionButton>
          <AdminActionButton onClick={handleLogout}>로그아웃</AdminActionButton>
        </>
      )}
    >

      <section aria-label="로그 검색과 필터" className="rounded-card border border-border bg-card p-4 sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(240px,1fr)_minmax(220px,0.7fr)_auto_auto] lg:items-end">
          <label className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-muted-strong">
            키워드 검색
            <input
              type="search"
              value={keywordInput}
              onChange={(event) => setKeywordInput(event.target.value)}
              placeholder="이벤트, endpoint, errorCode, 메시지"
              className="min-h-12 rounded-control border border-border bg-card px-3 text-foreground placeholder:text-muted-soft"
            />
          </label>
          <label className="flex min-w-0 flex-col gap-1.5 text-sm font-semibold text-muted-strong">
            requestId 검색
            <input
              type="search"
              value={requestIdInput}
              onChange={(event) => setRequestIdInput(event.target.value)}
              placeholder="전체 또는 앞 8자리"
              className="min-h-12 rounded-control border border-border bg-card px-3 font-mono text-foreground placeholder:font-sans placeholder:text-muted-soft"
            />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-muted-strong">
            날짜
            <select
              value={date ?? ""}
              onChange={(event) => setDate(event.target.value || null)}
              className="min-h-12 rounded-control border border-border bg-card px-3 text-foreground"
            >
              {dateOptions.map((option) => (
                <option key={option.value ?? "today"} value={option.value ?? ""}>{option.label}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-semibold text-muted-strong">
            조회 범위
            <select
              value={limit}
              onChange={(event) => setLimit(Number(event.target.value))}
              className="min-h-12 rounded-control border border-border bg-card px-3 text-foreground"
            >
              {LOG_LINE_LIMITS.map((value) => (
                <option key={value} value={value}>{value}건</option>
              ))}
            </select>
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border-soft pt-4">
          {LOG_LEVELS.map((level) => {
            const selected = levels.includes(level);
            return (
              <button
                key={level}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleLevel(level)}
                className={`min-h-11 rounded-control border px-4 text-sm font-semibold ${
                  selected ? LOG_LEVEL_STYLES[level] : "border-border text-muted-strong hover:bg-surface"
                }`}
              >
                {level}
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={slowRequestsOnly}
            onClick={() => setSlowRequestsOnly((active) => !active)}
            className={`min-h-11 rounded-control border px-4 text-sm font-semibold ${
              slowRequestsOnly ? "border-warn bg-warn-bg text-warn" : "border-border text-muted-strong hover:bg-surface"
            }`}
          >
            느린 요청만
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="min-h-11 rounded-control px-3 text-sm font-semibold text-muted hover:bg-surface hover:text-foreground"
          >
            필터 초기화
          </button>
          <label className={`ml-auto flex min-h-11 items-center gap-2 text-sm ${pastDate ? "text-muted" : "text-muted-strong"}`}>
            <input
              type="checkbox"
              checked={autoRefresh && !pastDate}
              disabled={pastDate}
              onChange={(event) => setAutoRefresh(event.target.checked)}
              className="size-4 accent-brand"
            />
            {pastDate ? "지난 날짜는 자동 새로고침하지 않아요" : `${REFRESH_INTERVAL_MS / 1000}초마다 자동 새로고침`}
          </label>
        </div>
      </section>

      {phase === "failed" && error ? <p role="alert" className="text-sm text-fail">{error}</p> : null}

      {data ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span>
              {data.entries.length}건 조회
              {data.truncated ? " · 오래된 내용은 잘렸어요" : ""}
              {pastDate && data.entries.length === 0
                ? ` · 이 날짜의 보관 로그가 없어요 (보관 기간 ${LOG_RETENTION_DAYS}일)`
                : ""}
            </span>
            <span>마지막 조회 {formatTime(data.readAt)} (KST · 로그 시각과 같은 기준)</span>
          </div>
          <AdminLogLines log={data} filters={filters} />
        </div>
      ) : null}

      {!data && phase === "loading" ? <p className="text-sm text-muted">불러오는 중</p> : null}
    </AdminShell>
  );
}

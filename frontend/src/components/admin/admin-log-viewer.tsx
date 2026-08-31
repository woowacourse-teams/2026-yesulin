"use client";

import Link from "next/link";
import { useState } from "react";
import { LOG_LINE_LIMITS } from "@/features/admin/api";
import type { AdminLogFilters } from "@/features/admin/log-view";
import { logout } from "@/features/auth/session-api";
import { AdminLoginForm } from "./admin-login-form";
import { AdminLogLines } from "./admin-log-lines";
import { formatTime } from "./admin-format";
import { REFRESH_INTERVAL_MS, useAdminLogs } from "./use-admin-logs";
import { useDebouncedValue } from "./use-debounced-value";

const SEARCH_DEBOUNCE_MS = 400;

export function AdminLogViewer() {
  const [keywordInput, setKeywordInput] = useState("");
  const [requestIdInput, setRequestIdInput] = useState("");
  const [errorsOnly, setErrorsOnly] = useState(false);
  const [slowRequestsOnly, setSlowRequestsOnly] = useState(false);
  const [limit, setLimit] = useState<number>(200);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const keyword = useDebouncedValue(keywordInput.trim(), SEARCH_DEBOUNCE_MS);
  const { phase, data, error, refresh, restart, signOut } = useAdminLogs(keyword, limit, autoRefresh);
  const filters: AdminLogFilters = {
    errorsOnly,
    slowRequestsOnly,
    requestId: requestIdInput,
    keyword,
  };

  function resetFilters() {
    setKeywordInput("");
    setRequestIdInput("");
    setErrorsOnly(false);
    setSlowRequestsOnly(false);
  }

  async function handleLogout() {
    await logout().catch(() => null);
    signOut();
  }

  if (phase === "unauthorized") {
    return <AdminLoginForm onSuccess={restart} />;
  }

  return (
    <main className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-[-0.02em] text-foreground">애플리케이션 로그</h1>
          <p className="mt-1 text-sm text-muted">
            최신 로그부터 표시합니다. 행을 펼치면 전체 필드와 stack trace를 확인할 수 있습니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center rounded-control border border-border bg-card px-4 text-sm font-semibold text-muted-strong hover:bg-surface"
          >
            대시보드
          </Link>
          <button
            type="button"
            onClick={refresh}
            className="min-h-11 rounded-control border border-border bg-card px-4 text-sm font-semibold text-muted-strong hover:bg-surface"
          >
            새로고침
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="min-h-11 rounded-control border border-border bg-card px-4 text-sm font-semibold text-muted-strong hover:bg-surface"
          >
            로그아웃
          </button>
        </div>
      </header>

      <section aria-label="로그 검색과 필터" className="rounded-card border border-border bg-card p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[minmax(240px,1fr)_minmax(220px,0.7fr)_auto] lg:items-end">
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
          <button
            type="button"
            aria-pressed={errorsOnly}
            onClick={() => setErrorsOnly((active) => !active)}
            className={`min-h-11 rounded-control border px-4 text-sm font-semibold ${
              errorsOnly ? "border-fail bg-fail-bg text-fail" : "border-border text-muted-strong hover:bg-surface"
            }`}
          >
            ERROR만
          </button>
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
          <label className="ml-auto flex min-h-11 items-center gap-2 text-sm text-muted-strong">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(event) => setAutoRefresh(event.target.checked)}
              className="size-4 accent-brand"
            />
            {REFRESH_INTERVAL_MS / 1000}초마다 자동 새로고침
          </label>
        </div>
      </section>

      {phase === "failed" && error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}

      {data ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
            <span>
              {data.entries.length}건 조회
              {data.truncated ? " · 오래된 내용은 잘렸습니다" : ""}
            </span>
            <span>마지막 조회 {formatTime(data.readAt)} (KST · 로그 시각과 같은 기준)</span>
          </div>
          <AdminLogLines log={data} filters={filters} />
        </div>
      ) : null}

      {!data && phase === "loading" ? <p className="text-sm text-muted">불러오는 중</p> : null}
    </main>
  );
}

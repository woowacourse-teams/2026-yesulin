"use client";

import Link from "next/link";
import { useState } from "react";
import { LOG_LINE_LIMITS } from "@/features/admin/api";
import { logout } from "@/features/auth/session-api";
import { AdminLoginForm } from "./admin-login-form";
import { AdminLogLines } from "./admin-log-lines";
import { formatTime } from "./admin-format";
import { REFRESH_INTERVAL_MS, useAdminLogs } from "./use-admin-logs";
import { useDebouncedValue } from "./use-debounced-value";

const SEARCH_DEBOUNCE_MS = 400;

export function AdminLogViewer() {
  const [keywordInput, setKeywordInput] = useState("");
  const [limit, setLimit] = useState<number>(200);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const keyword = useDebouncedValue(keywordInput.trim(), SEARCH_DEBOUNCE_MS);
  const { phase, data, error, refresh, restart } = useAdminLogs(keyword, limit, autoRefresh);

  async function handleLogout() {
    await logout().catch(() => null);
    restart();
  }

  if (phase === "unauthorized") {
    return <AdminLoginForm onSuccess={restart} />;
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">애플리케이션 로그</h1>
          <p className="text-xs text-neutral-500">
            서버가 기록한 로그를 읽기만 합니다. 명령 실행이나 파일 변경은 하지 않습니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin"
            className="rounded border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            대시보드
          </Link>
          <button
            type="button"
            onClick={refresh}
            className="rounded border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            새로고침
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="rounded border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            로그아웃
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-60 flex-1 flex-col gap-1 text-sm text-neutral-700">
          검색 (대소문자 구분 없음)
          <input
            type="search"
            value={keywordInput}
            onChange={(event) => setKeywordInput(event.target.value)}
            placeholder="ERROR, requestId, 클래스명 등"
            className="rounded border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-neutral-900 focus:outline-none"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm text-neutral-700">
          표시 줄 수
          <select
            value={limit}
            onChange={(event) => setLimit(Number(event.target.value))}
            className="rounded border border-neutral-300 px-3 py-2 text-neutral-900 focus:border-neutral-900 focus:outline-none"
          >
            {LOG_LINE_LIMITS.map((value) => (
              <option key={value} value={value}>{value}줄</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(event) => setAutoRefresh(event.target.checked)}
            className="size-4"
          />
          {REFRESH_INTERVAL_MS / 1000}초마다 자동 새로고침
        </label>
      </div>

      {phase === "failed" && error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}

      {data ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-neutral-500">
            <span>
              {data.lines.length}줄 표시
              {data.truncated ? " · 오래된 내용은 잘렸습니다" : ""}
            </span>
            <span>마지막 조회 {formatTime(data.readAt)}</span>
          </div>
          <AdminLogLines log={data} keyword={keyword} />
        </div>
      ) : (
        <p className="text-sm text-neutral-500">불러오는 중</p>
      )}
    </main>
  );
}

"use client";

import Link from "next/link";
import { useState } from "react";
import { logout } from "@/features/auth/session-api";
import { AdminAuditLogTable } from "./admin-audit-log-table";
import { AdminAuditionTable } from "./admin-audition-table";
import { AdminLoginForm } from "./admin-login-form";
import { AdminOverviewCards } from "./admin-overview-cards";
import { AdminProducerTable } from "./admin-producer-table";
import { useAdminDashboard, type ProducerFilter } from "./use-admin-dashboard";

const PRODUCER_FILTERS: readonly { readonly label: string; readonly value: ProducerFilter }[] = [
  { label: "전체", value: "ALL" },
  { label: "인증 대기", value: "PENDING" },
  { label: "활성", value: "ACTIVE" },
];

export function AdminDashboard() {
  const [producerFilter, setProducerFilter] = useState<ProducerFilter>("ALL");
  const { phase, data, error, refresh, restart, signOut } = useAdminDashboard(producerFilter);

  async function handleLogout() {
    await logout().catch(() => null);
    signOut();
  }

  if (phase === "unauthorized") {
    return <AdminLoginForm onSuccess={restart} />;
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-6xl px-6 py-16">
        <p className="text-sm text-neutral-500">{phase === "failed" ? error : "불러오는 중"}</p>
      </main>
    );
  }

  return (
    <main className="mx-auto flex max-w-6xl flex-col gap-8 px-6 py-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-neutral-900">운영 대시보드</h1>
          <p className="text-xs text-neutral-500">
            개발팀 전용 화면입니다. 수동 활성화는 기획사 이메일 인증을 대신하므로 필요한 경우에만 사용하세요.
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/admin/logs"
            className="rounded border border-neutral-300 px-3 py-1.5 text-sm text-neutral-700 hover:bg-neutral-50"
          >
            로그
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

      {phase === "failed" && error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}

      <AdminOverviewCards overview={data.overview} />

      <div className="flex flex-wrap gap-2">
        {PRODUCER_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            aria-pressed={producerFilter === filter.value}
            onClick={() => setProducerFilter(filter.value)}
            className={`rounded border px-3 py-1 text-sm ${
              producerFilter === filter.value
                ? "border-neutral-900 bg-neutral-900 text-white"
                : "border-neutral-300 text-neutral-700 hover:bg-neutral-50"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      <AdminProducerTable producers={data.producers} onChanged={refresh} />
      <AdminAuditionTable auditions={data.auditions} onChanged={refresh} />
      <AdminAuditLogTable logs={data.logs} />
    </main>
  );
}

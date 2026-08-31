"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AdminApiError,
  fetchAuditLogs,
  fetchAuditions,
  fetchOverview,
  fetchProducers,
} from "@/features/admin/api";
import type { AdminAuditLogPage, AdminAudition, AdminOverview, AdminProducer, MemberStatus } from "@/features/admin/types";

export type ProducerFilter = MemberStatus | "ALL";

export type DashboardData = {
  readonly overview: AdminOverview;
  readonly producers: readonly AdminProducer[];
  readonly auditions: readonly AdminAudition[];
  readonly auditLogs: AdminAuditLogPage;
};

export type DashboardPhase = "loading" | "unauthorized" | "ready" | "failed";

async function loadDashboard(filter: ProducerFilter, auditLogPage: number): Promise<DashboardData> {
  const [overview, producers, auditions, auditLogs] = await Promise.all([
    fetchOverview(),
    fetchProducers(filter === "ALL" ? undefined : filter),
    fetchAuditions(),
    fetchAuditLogs(auditLogPage),
  ]);
  return { overview, producers, auditions, auditLogs };
}

/** 운영 대시보드의 조회 상태를 담는다. 401·403은 로그인 화면으로 되돌리는 신호로 구분한다. */
export function useAdminDashboard(filter: ProducerFilter, auditLogPage: number) {
  const [phase, setPhase] = useState<DashboardPhase>("loading");
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    loadDashboard(filter, auditLogPage)
      .then((next) => {
        if (!active) return;
        setData(next);
        setError(null);
        setPhase("ready");
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403)) {
          setPhase("unauthorized");
          return;
        }
        console.error("[운영 대시보드 조회 실패]", cause);
        setError(cause instanceof Error ? cause.message : "대시보드를 불러오지 못했습니다.");
        setPhase("failed");
      });

    return () => {
      active = false;
    };
  }, [auditLogPage, filter, reloadToken]);

  const refresh = useCallback(() => setReloadToken((token) => token + 1), []);
  const restart = useCallback(() => {
    setPhase("loading");
    setReloadToken((token) => token + 1);
  }, []);
  const signOut = useCallback(() => {
    setData(null);
    setPhase("unauthorized");
  }, []);

  return { phase, data, error, refresh, restart, signOut };
}

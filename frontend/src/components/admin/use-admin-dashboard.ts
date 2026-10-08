"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AdminApiError,
  fetchActivity,
  fetchAuditLogs,
  fetchAuditions,
  fetchMemberStats,
  fetchOverview,
  fetchProducers,
  fetchShows,
} from "@/features/admin/api";
import type {
  AdminAuditLogPage,
  AdminAudition,
  AdminDailyActivity,
  AdminMemberStats,
  AdminOverview,
  AdminProducer,
  AdminShow,
} from "@/features/admin/types";

export type DashboardData = {
  readonly overview: AdminOverview;
  readonly memberStats: AdminMemberStats;
  readonly activity: readonly AdminDailyActivity[];
  readonly producers: readonly AdminProducer[];
  readonly auditions: readonly AdminAudition[];
  readonly shows: readonly AdminShow[];
  /** 대시보드를 마지막으로 불러온 시각이다. 지난 회차 판단과 갱신 시각 표시에 쓴다. */
  readonly loadedAt: number;
};

export type DashboardPhase = "loading" | "unauthorized" | "ready" | "failed";

async function loadDashboard(): Promise<DashboardData> {
  const [overview, memberStats, activity, producers, auditions, shows] = await Promise.all([
    fetchOverview(),
    fetchMemberStats(),
    fetchActivity(),
    fetchProducers(),
    fetchAuditions(),
    fetchShows(),
  ]);
  return { overview, memberStats, activity, producers, auditions, shows, loadedAt: Date.now() };
}

const isUnauthorized = (cause: unknown) =>
  cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403);

/**
 * 운영 대시보드의 조회 상태를 담는다. 탭을 바꿔도 다시 부르지 않도록 섹션 데이터를 한 번에 읽고,
 * 페이지를 넘기는 변경 기록만 따로 읽는다. 401·403은 운영 화면을 닫고 서버 접근 검사를 다시 하는 신호로 구분한다.
 */
export function useAdminDashboard(auditLogPage: number) {
  const [phase, setPhase] = useState<DashboardPhase>("loading");
  const [data, setData] = useState<DashboardData | null>(null);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLogPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  const handleFailure = useCallback((cause: unknown, label: string) => {
    if (isUnauthorized(cause)) {
      setPhase("unauthorized");
      return;
    }
    console.error(`[${label}]`, cause);
    setError(cause instanceof Error ? cause.message : "대시보드를 불러오지 못했습니다.");
    setPhase("failed");
  }, []);

  useEffect(() => {
    let active = true;
    loadDashboard()
      .then((next) => {
        if (!active) return;
        setData(next);
        setError(null);
        setPhase("ready");
      })
      .catch((cause: unknown) => {
        if (active) handleFailure(cause, "운영 대시보드 조회 실패");
      });
    return () => {
      active = false;
    };
  }, [handleFailure, reloadToken]);

  useEffect(() => {
    let active = true;
    fetchAuditLogs(auditLogPage)
      .then((next) => {
        if (active) setAuditLogs(next);
      })
      .catch((cause: unknown) => {
        if (active) handleFailure(cause, "운영자 변경 기록 조회 실패");
      });
    return () => {
      active = false;
    };
  }, [auditLogPage, handleFailure, reloadToken]);

  const refresh = useCallback(() => setReloadToken((token) => token + 1), []);
  const restart = useCallback(() => {
    setPhase("loading");
    setReloadToken((token) => token + 1);
  }, []);
  const signOut = useCallback(() => {
    setData(null);
    setAuditLogs(null);
    setPhase("unauthorized");
  }, []);

  return { phase, data, auditLogs, error, refresh, restart, signOut };
}

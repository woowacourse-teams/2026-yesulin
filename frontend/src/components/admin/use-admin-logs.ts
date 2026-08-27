"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminApiError, fetchLogs } from "@/features/admin/api";
import type { AdminLog } from "@/features/admin/types";

export type LogPhase = "loading" | "unauthorized" | "ready" | "failed";

/** 자동 새로고침 주기다. 짧게 잡으면 서버 읽기가 잦아지므로 5초로 둔다. */
export const REFRESH_INTERVAL_MS = 5000;

/**
 * 로그를 주기적으로 다시 읽는다. 탭이 보이지 않는 동안에는 요청을 건너뛰어 낭비를 막는다.
 */
export function useAdminLogs(keyword: string, limit: number, autoRefresh: boolean) {
  const [phase, setPhase] = useState<LogPhase>("loading");
  const [data, setData] = useState<AdminLog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;

    const load = () => {
      fetchLogs(keyword, limit)
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
          setError(cause instanceof Error ? cause.message : "로그를 불러오지 못했습니다.");
          setPhase("failed");
        });
    };

    load();
    if (!autoRefresh) {
      return () => {
        active = false;
      };
    }

    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") load();
    }, REFRESH_INTERVAL_MS);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [keyword, limit, autoRefresh, reloadToken]);

  const refresh = useCallback(() => setReloadToken((token) => token + 1), []);
  const restart = useCallback(() => {
    setPhase("loading");
    setReloadToken((token) => token + 1);
  }, []);

  return { phase, data, error, refresh, restart };
}

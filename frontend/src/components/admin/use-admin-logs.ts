"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminApiError, fetchLogs } from "@/features/admin/api";
import type { AdminLog } from "@/features/admin/types";

export type LogPhase = "loading" | "unauthorized" | "ready" | "failed";

/** 자동 새로고침 주기다. 짧게 잡으면 서버 읽기가 잦아지므로 5초로 둔다. */
export const REFRESH_INTERVAL_MS = 5000;

/**
 * 로그를 주기적으로 다시 읽는다.
 * 탭이 보이지 않는 동안에는 요청을 건너뛰고, 같은 조건의 앞선 요청이 끝나기 전에는 새 요청을 보내지 않는다.
 * 조건(날짜·검색어·범위)이 바뀌면 이전 요청을 기다리지 않고 바로 다시 읽으며, 이전 응답은 버린다.
 * 지난 날짜(date)의 보관 로그는 바뀌지 않으므로 자동으로 다시 읽지 않는다.
 */
export function useAdminLogs(keyword: string, limit: number, autoRefresh: boolean, date: string | null) {
  const [phase, setPhase] = useState<LogPhase>("loading");
  const [data, setData] = useState<AdminLog | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    let running = false;

    const load = () => {
      if (running) return;
      running = true;

      fetchLogs(keyword, limit, date)
        .then((next) => {
          if (!active) return;
          setData(next);
          setError(null);
          setPhase("ready");
        })
        .catch((cause: unknown) => {
          if (!active) return;
          if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403)) {
            setData(null);
            setPhase("unauthorized");
            return;
          }
          console.error("[운영 로그 조회 실패]", cause);
          setError(cause instanceof Error ? cause.message : "로그를 불러오지 못했습니다.");
          setPhase("failed");
        })
        .finally(() => {
          running = false;
        });
    };

    load();
    if (!autoRefresh || date) {
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
  }, [keyword, limit, autoRefresh, date, reloadToken]);

  const refresh = useCallback(() => setReloadToken((token) => token + 1), []);

  /** 다시 불러오기 전에 이전 결과를 지운다. 로그인 직후 다른 세션의 로그가 남아 보이지 않게 한다. */
  const restart = useCallback(() => {
    setData(null);
    setError(null);
    setPhase("loading");
    setReloadToken((token) => token + 1);
  }, []);

  const signOut = useCallback(() => {
    setData(null);
    setError(null);
    setPhase("unauthorized");
  }, []);

  return { phase, data, error, refresh, restart, signOut };
}

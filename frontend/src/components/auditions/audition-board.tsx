"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getAuditionBoard } from "@/features/auditions/api";
import {
  initialFilters,
  screeningSearchKey,
  toScreeningSearchCondition,
  type AuditionListRouteState,
} from "@/features/auditions/filters";
import { auditionRoutes } from "@/features/auditions/routes";
import type { RoleId, RoundNumber, AuditionBoardResponse } from "@/features/auditions/types";
import { useAuditionQuery } from "@/features/auditions/use-audition-query";
import { Breadcrumb } from "./breadcrumb";
import { BoardWorkspace } from "./board-workspace";
import { ScreenError } from "./screen-status";

export function AuditionBoard({
  roleId,
  initialRound = null,
  initialFilterState,
}: {
  roleId: RoleId;
  initialRound?: RoundNumber | null;
  initialFilterState?: AuditionListRouteState;
}) {
  const [round, setRound] = useState<RoundNumber | null>(initialRound);
  const [filters, setFilters] = useState(() => (
    initialFilterState ?? initialFilters("PENDING")
  ));
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const debouncedQuery = useDebouncedValue(filters.query, 300);
  const searchCondition = useMemo(
    () => toScreeningSearchCondition(filters, debouncedQuery),
    [debouncedQuery, filters],
  );
  const requestKey = `${roleId}:${round ?? "auto"}:${screeningSearchKey(searchCondition)}`;
  /** 심사·종료 응답으로 갱신된 보드. 조회 결과보다 우선하고, 차수가 바뀌면 무효가 된다. */
  const [applied, setApplied] = useState<{ key: string; board: AuditionBoardResponse } | null>(
    null,
  );

  const load = useCallback(
    () => getAuditionBoard(roleId, round, searchCondition),
    [roleId, round, searchCondition],
  );
  const { data, previousData, error, loading, reload } = useAuditionQuery(
    requestKey,
    load,
    "배우를 불러오지 못했습니다.",
  );

  const previousBoard =
    previousData?.role.id === roleId && (round === null || previousData.round === round)
      ? previousData
      : null;
  const board = applied?.key === requestKey ? applied.board : data ?? (loading ? previousBoard : null);

  useEffect(() => {
    if (!board) return;
    const nextHref = auditionRoutes.role(roleId, board.round, filters);
    const currentHref = `${pathname}${searchParams.size > 0 ? `?${searchParams.toString()}` : ""}`;
    if (currentHref !== nextHref) router.replace(nextHref, { scroll: false });
  }, [board, filters, pathname, roleId, router, searchParams]);

  const applyBoard = useCallback((next: AuditionBoardResponse) => {
    setApplied({ key: requestKey, board: next });
    setRound(next.round);
  }, [requestKey]);

  const goToRound = useCallback((next: RoundNumber) => {
    setApplied(null);
    setFilters(initialFilters(board?.role.allRoundsClosed ? "DONE" : "PENDING"));
    setRound(next);
  }, [board]);

  return (
    <>
      <Breadcrumb
        items={[
          { label: "전체 공연", href: auditionRoutes.performances },
          {
            label: board?.performance.title ?? "공연",
            href: board ? auditionRoutes.performance(board.performance.id) : undefined,
          },
          {
            label: board?.posting.title ?? "공고",
            href: board ? auditionRoutes.posting(board.posting.id) : undefined,
          },
          {
            label: board?.role.name ?? "배역",
          },
        ]}
      />

      {error ? (
        <div className="p-4 md:p-6">
          <ScreenError message={error} onRetry={reload} />
        </div>
      ) : null}

      {board ? (
        <div aria-busy={loading}>
          {loading ? <span className="sr-only" role="status">지원자 목록을 갱신하는 중입니다.</span> : null}
          <BoardWorkspace
            key={`${board.role.id}:${board.round}`}
            board={board}
            filters={filters}
            searchCondition={searchCondition}
            setFilters={setFilters}
            onBoardChange={applyBoard}
            onRoundChange={goToRound}
          />
        </div>
      ) : null}

      {loading && !board && !error ? <BoardSkeleton /> : null}
    </>
  );
}

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timeout);
  }, [delayMs, value]);

  return debounced;
}

function BoardSkeleton() {
  return (
    <div aria-label="배우를 불러오는 중">
      <div className="h-[86px] animate-pulse border-b border-border bg-card" />
      <div className="h-[46px] animate-pulse border-b border-border bg-card" />
      <div className="h-[47px] animate-pulse border-b border-border bg-card" />
      <div className="grid gap-3 px-4 py-4 [grid-template-columns:repeat(auto-fill,minmax(152px,1fr))] md:px-6">
        {[0, 1, 2, 3, 4, 5].map((slot) => (
          <div key={slot} className="h-[248px] animate-pulse rounded-lg border border-border bg-card" />
        ))}
      </div>
    </div>
  );
}

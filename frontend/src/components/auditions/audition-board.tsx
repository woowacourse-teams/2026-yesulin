"use client";

import { useCallback, useState } from "react";
import { getAuditionBoard } from "@/features/auditions/api";
import { auditionRoutes } from "@/features/auditions/routes";
import type { RoleId, RoundNumber, AuditionBoardResponse } from "@/features/auditions/types";
import { useAuditionQuery } from "@/features/auditions/use-audition-query";
import { Breadcrumb } from "./breadcrumb";
import { BoardWorkspace } from "./board-workspace";
import { ScreenError } from "./screen-status";

export function AuditionBoard({ roleId }: { roleId: RoleId }) {
  const [round, setRound] = useState<RoundNumber | null>(null);
  /** 심사·마감 응답으로 갱신된 보드. 조회 결과보다 우선하고, 차수가 바뀌면 무효가 된다. */
  const [applied, setApplied] = useState<{ round: RoundNumber; board: AuditionBoardResponse } | null>(
    null,
  );

  const load = useCallback(() => getAuditionBoard(roleId, round), [roleId, round]);
  const { data, error, loading, reload } = useAuditionQuery(
    `${roleId}:${round ?? "auto"}`,
    load,
    "지원자를 불러오지 못했습니다.",
  );

  const board = applied && applied.round === round ? applied.board : data;

  const applyBoard = useCallback((next: AuditionBoardResponse) => {
    setApplied({ round: next.round, board: next });
    setRound(next.round);
  }, []);

  const goToRound = useCallback((next: RoundNumber) => {
    setApplied(null);
    setRound(next);
  }, []);

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
        <BoardWorkspace
          key={`${board.role.id}:${board.round}`}
          board={board}
          onBoardChange={applyBoard}
          onRoundChange={goToRound}
        />
      ) : null}

      {loading && !board && !error ? <BoardSkeleton /> : null}
    </>
  );
}

function BoardSkeleton() {
  return (
    <div aria-label="지원자를 불러오는 중">
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

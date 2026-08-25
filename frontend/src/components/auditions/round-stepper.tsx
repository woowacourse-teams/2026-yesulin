"use client";

import { ROUND_LABELS } from "@/features/auditions/labels";
import type { RoundState } from "@/features/auditions/types";
import { ApplicationLinkButton } from "./application-link-button";
import { HorizontalScrollArea } from "./horizontal-scroll-area";
import { useBoard } from "./board-context";

function subtitleOf(state: RoundState) {
  if (!state.open) return `${ROUND_LABELS[(state.round - 1) as 1 | 2]} 마감 후 열립니다`;
  if (state.closed) return `합격 ${state.counts.pass}명`;
  if (state.counts.all === 0) return "대상 없음";
  return null;
}

export function RoundStepper() {
  const { board, goToRound, roundClosed, setClosePrompt } = useBoard();
  const roundIndex = board.rounds.findIndex((state) => state.round === board.round);
  const currentRound = board.rounds[roundIndex];
  const canClose = Boolean(
    currentRound && !roundClosed && currentRound.counts.all > 0 && currentRound.counts.pending === 0,
  );
  const nextRoundName = board.rounds[roundIndex + 1]?.name;

  return (
    <div className="flex items-stretch border-b border-border bg-card">
      <HorizontalScrollArea className="min-w-0 flex-1">
        <nav aria-label="전형 차수" className="flex min-w-max gap-2 px-4 py-2 md:px-6">
          {board.rounds.map((state) => {
            const selected = state.round === board.round;
            const subtitle = subtitleOf(state);

            return (
              <button
                key={state.round}
                type="button"
                aria-current={selected ? "step" : undefined}
                disabled={!state.open}
                onClick={() => goToRound(state.round)}
                className={`flex min-h-14 items-center gap-2 whitespace-nowrap rounded-control px-3 text-left transition-colors disabled:cursor-not-allowed disabled:text-muted md:min-h-[72px] md:min-w-[108px] md:flex-col md:items-start md:justify-center md:gap-0.5 ${
                  selected ? "bg-brand-soft text-brand" : "hover:bg-surface"
                }`}
              >
                <span
                  className={`flex items-center gap-1 text-xs ${selected ? "font-semibold text-brand" : "text-muted"}`}
                >
                  {state.name}
                  {state.closed ? (
                    <span className="rounded-full border border-border bg-card px-1 text-xs text-muted-strong">
                      마감
                    </span>
                  ) : !state.open ? (
                    <span className="rounded-full border border-border px-1 text-xs text-muted">
                      잠김
                    </span>
                  ) : null}
                </span>

                <span
                  className={`num text-lg font-bold leading-[1.15] tracking-[-0.03em] md:text-[21px] ${selected ? "text-brand" : "text-foreground"}`}
                >
                  {state.open ? state.counts.all : "—"}
                  <small className="ml-1 text-xs font-medium text-muted">
                    {state.open ? "명" : ""}
                  </small>
                </span>

                <span className="hidden text-xs text-muted md:block">
                  {subtitle ?? (
                    <span className="num">
                      검토 {state.counts.done}/{state.counts.all}명
                    </span>
                  )}
                </span>
              </button>
            );
          })}
        </nav>
      </HorizontalScrollArea>
      {currentRound ? (
        <div className="hidden shrink-0 items-center border-l border-border-soft px-4 lg:flex">
          {roundClosed ? (
            <span className="whitespace-nowrap text-xs font-semibold text-muted-strong">
              {currentRound.name} 마감됨
            </span>
          ) : canClose ? (
            <button
              type="button"
              onClick={() => setClosePrompt("manual")}
              className="inline-flex min-h-10 items-center rounded-control border border-brand-line bg-card px-3 text-sm font-semibold text-brand hover:border-brand hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-soft"
            >
              {nextRoundName ? "차수 마감" : "전형 종료"}
            </button>
          ) : (
            <span
              className="whitespace-nowrap text-xs text-muted"
              title={currentRound.counts.all === 0 ? "심사할 배우가 없습니다" : undefined}
            >
              {currentRound.counts.all === 0 ? (
                "마감 대상 없음"
              ) : (
                <>
                  검토 대기 <b className="num text-foreground">{currentRound.counts.pending}</b>명
                </>
              )}
            </span>
          )}
        </div>
      ) : null}
      <div className="flex shrink-0 items-center border-l border-border-soft px-2 md:px-4">
        <ApplicationLinkButton postingId={board.posting.id} compact />
      </div>
    </div>
  );
}

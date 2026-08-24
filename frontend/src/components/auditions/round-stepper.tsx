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
  const { board, goToRound } = useBoard();

  return (
    <div className="flex items-stretch border-b border-border bg-card">
      <HorizontalScrollArea className="min-w-0 flex-1">
      <nav aria-label="전형 차수" className="flex min-w-max px-4 md:px-6">
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
              className={`relative mr-5 flex min-h-16 items-center gap-2 whitespace-nowrap border-b-2 pr-5 text-left transition-colors last:mr-0 last:pr-0 disabled:cursor-not-allowed disabled:border-transparent disabled:text-muted md:mr-6 md:min-h-0 md:flex-col md:items-start md:gap-0.5 md:pb-3 md:pr-6 md:pt-4 ${
                selected ? "border-brand" : "border-transparent"
              } after:absolute after:right-0 after:top-1/2 after:h-[7px] after:w-[7px] after:-translate-y-1/2 after:rotate-45 after:border-r-[1.5px] after:border-t-[1.5px] after:border-muted-soft last:after:hidden`}
            >
            <span
              className={`flex items-center gap-1 text-xs ${selected ? "font-semibold text-brand" : "text-muted"}`}
            >
              {state.name}
              {state.closed ? (
                <span className="rounded-full border border-pass bg-pass-bg px-1 text-xs text-pass">
                  마감
                </span>
              ) : !state.open ? (
                <span className="rounded-full border border-border px-1 text-xs text-muted">잠김</span>
              ) : null}
            </span>

            <span className="num text-lg font-bold leading-[1.15] tracking-[-0.03em] md:text-[21px]">
              {state.open ? state.counts.all : "—"}
              <small className="ml-1 text-xs font-medium text-muted">{state.open ? "명" : ""}</small>
            </span>

            <span className="hidden text-xs text-muted md:block">
              {subtitle ?? (
                <>
                  검토 {state.progress.percent}%
                  <span className="num ml-1 opacity-60">
                    {state.counts.done}/{state.counts.all}
                  </span>
                </>
              )}
            </span>

            {state.open && state.counts.all > 0 ? (
              <span className="mt-1.5 hidden h-[3px] min-w-[78px] overflow-hidden rounded-full bg-border-soft md:block">
                <i
                  className={`block h-full transition-[width] duration-300 ${
                    state.progress.percent === 100 ? "bg-pass" : selected ? "bg-brand" : "bg-muted-soft"
                  }`}
                  style={{ width: `${state.progress.percent}%` }}
                />
              </span>
            ) : null}
            </button>
          );
        })}
      </nav>
      </HorizontalScrollArea>
      <div className="flex shrink-0 items-center border-l border-border-soft px-2 md:px-4">
        <ApplicationLinkButton postingId={board.posting.id} compact />
      </div>
    </div>
  );
}

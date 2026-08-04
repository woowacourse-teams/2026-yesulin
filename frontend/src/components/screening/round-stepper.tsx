"use client";

import { ROUND_LABELS } from "@/features/screening/labels";
import type { RoundState } from "@/features/screening/types";
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
    <nav aria-label="전형 차수" className="flex overflow-x-auto border-b border-border bg-card px-4 md:px-6">
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
            className={`relative mr-[26px] flex flex-col gap-0.5 whitespace-nowrap border-b-2 pb-[13px] pr-[26px] pt-[15px] text-left transition-colors last:mr-0 last:pr-0 disabled:cursor-not-allowed disabled:opacity-35 ${
              selected ? "border-brand" : "border-transparent"
            } after:absolute after:right-0 after:top-1/2 after:h-[7px] after:w-[7px] after:-translate-y-1/2 after:rotate-45 after:border-r-[1.5px] after:border-t-[1.5px] after:border-muted-soft last:after:hidden`}
          >
            <span
              className={`flex items-center gap-[5px] text-[11.5px] ${selected ? "font-semibold text-brand" : "text-muted"}`}
            >
              {state.name}
              {state.closed ? (
                <span className="rounded-full border border-pass bg-pass-bg px-[5px] text-[10px] text-pass">
                  마감
                </span>
              ) : !state.open ? (
                <span className="rounded-full border border-border px-[5px] text-[10px] text-muted">잠김</span>
              ) : null}
            </span>

            <span className="num text-[21px] font-bold leading-[1.15] tracking-[-0.03em]">
              {state.open ? state.counts.all : "—"}
              <small className="ml-[3px] text-xs font-medium text-muted">{state.open ? "명" : ""}</small>
            </span>

            <span className="text-[11px] text-muted">
              {subtitle ?? (
                <>
                  검토 {state.progress.percent}%
                  <span className="num ml-[5px] opacity-60">
                    {state.counts.done}/{state.counts.all}
                  </span>
                </>
              )}
            </span>

            {state.open && state.counts.all > 0 ? (
              <span className="mt-1.5 block h-[3px] min-w-[78px] overflow-hidden rounded-full bg-border-soft">
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
  );
}

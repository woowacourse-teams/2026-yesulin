"use client";

import type { WorkMode } from "@/features/auditions/filters";
import { useBoard } from "./board-context";
import { CloseRoundModal } from "./close-round-modal";
import { PrimaryButton } from "@/components/ui/controls";

const TABS = [
  { mode: "PENDING", label: "검토 대기" },
  { mode: "DONE", label: "검토 완료" },
] as const satisfies readonly { mode: WorkMode; label: string }[];

export function WorkSplit() {
  const { board, filters, roundClosed, setFilters, clearSelection, closePrompt, setClosePrompt } =
    useBoard();
  const counts = board.rounds.find((state) => state.round === board.round)?.counts;
  if (!counts) return null;
  const currentIndex = board.rounds.findIndex((state) => state.round === board.round);
  const currentName = board.rounds[currentIndex]?.name ?? `${board.round}차 전형`;
  const nextName = board.rounds[currentIndex + 1]?.name;

  const canClose = !roundClosed && counts.all > 0 && counts.pending === 0;

  return (
    <>
      <div className="flex flex-wrap items-center border-b border-border bg-transparent px-4 md:px-6 xl:px-8">
        {TABS.map((tab) => {
          const active = filters.work === tab.mode;
          return (
            <button
              key={tab.mode}
              type="button"
              aria-pressed={active}
              onClick={() => {
                clearSelection();
                setFilters((current) => ({
                  ...current,
                  work: tab.mode,
                  status: tab.mode === "DONE" ? "PASS" : "ALL",
                }));
              }}
              className={`mr-6 flex items-center gap-2 border-b-2 py-3 text-dense transition-colors ${
                active ? "border-foreground font-semibold text-foreground" : "border-transparent text-muted"
              }`}
            >
              {tab.label}
              <b className={`num text-[15px] font-bold tracking-[-0.02em] ${active ? "text-brand" : ""}`}>
                {tab.mode === "PENDING" ? counts.pending : counts.done}
              </b>
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-2.5 py-2">
          {roundClosed ? (
            <span className="rounded-full bg-pass-bg px-3 py-1 text-xs font-semibold text-pass">
              {currentName} 마감됨 · 합격 {counts.pass}명
            </span>
          ) : (
            <>
              <span className="hidden text-xs text-muted sm:inline">
                {counts.pending > 0
                  ? `검토 대기 ${counts.pending}명이 남아 마감할 수 없습니다`
                  : "검토를 모두 마쳤습니다"}
              </span>
              <PrimaryButton
                disabled={!canClose}
                onClick={() => setClosePrompt("manual")}
                className="whitespace-nowrap lg:min-h-9 lg:px-3 lg:text-dense"
              >
                {currentName} 마감하고 {nextName ? `${nextName} 시작` : "전형 종료"}
              </PrimaryButton>
            </>
          )}
        </div>
      </div>

      {closePrompt ? (
        <CloseRoundModal auto={closePrompt === "auto"} onClose={() => setClosePrompt(null)} />
      ) : null}
    </>
  );
}

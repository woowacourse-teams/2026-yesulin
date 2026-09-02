"use client";

import { defaultStatusForWork, type WorkMode } from "@/features/auditions/filters";
import { useBoard } from "./board-context";
import { ScreeningCompletionModal } from "./screening-completion-modal";
import { PrimaryButton } from "@/components/ui/controls";

const TABS = [
  { mode: "PENDING", label: "검토 대기" },
  { mode: "DONE", label: "검토 완료" },
] as const satisfies readonly { mode: WorkMode; label: string }[];

export function WorkSplit() {
  const { board, filters, screeningCompleted, setFilters, clearSelection, completionPrompt, setCompletionPrompt } =
    useBoard();
  const counts = board.rounds.find((state) => state.round === board.round)?.counts;
  if (!counts) return null;
  const currentRound = board.rounds.find((state) => state.round === board.round);
  const canComplete = !screeningCompleted
    && currentRound !== undefined
    && !currentRound.closed
    && board.role.activeRound === board.round;

  return (
    <>
      <div className="flex min-h-12 items-center border-b border-border bg-transparent px-4 md:px-6 lg:hidden">
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
                  status: defaultStatusForWork(tab.mode),
                }));
              }}
              className={`mr-4 flex min-h-12 items-center gap-1.5 border-b-2 py-2 text-sm transition-colors sm:mr-6 lg:text-dense ${
                active ? "border-foreground font-semibold text-foreground" : "border-transparent text-muted"
              }`}
            >
              {tab.label}
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-2">
          {screeningCompleted ? <span className="whitespace-nowrap rounded-full bg-pass-bg px-2.5 py-1 text-xs font-semibold text-pass">전형 종료</span> : canComplete ? <PrimaryButton onClick={() => setCompletionPrompt("manual")} className="min-h-9 whitespace-nowrap px-3 text-sm">전형 마감</PrimaryButton> : <span className="whitespace-nowrap text-xs text-muted">대기 <b className="num text-foreground">{counts.pending}</b>명</span>}
        </div>
      </div>

      {completionPrompt ? (
        <ScreeningCompletionModal auto={completionPrompt === "auto"} onClose={() => setCompletionPrompt(null)} />
      ) : null}
    </>
  );
}

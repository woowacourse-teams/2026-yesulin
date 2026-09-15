"use client";

import { defaultStatusForWork, viewForWork, type AuditionFilters, type WorkMode } from "@/features/auditions/filters";
import { roundTitle } from "@/features/auditions/labels";
import type { RoundNumber } from "@/features/auditions/types";
import { SecondaryButton, SegmentButton } from "@/components/ui/controls";
import { ApplicationLinkButton } from "./application-link-button";
import { useBoard } from "./board-context";

const WORK_TABS = [
  { mode: "PENDING", label: "심사 전" },
  { mode: "DONE", label: "심사 후" },
] as const satisfies readonly { mode: WorkMode; label: string }[];

const VIEW_TABS = [
  { view: "single", label: "한 명씩" },
  { view: "card", label: "카드" },
  { view: "table", label: "표" },
] as const satisfies readonly { view: AuditionFilters["view"]; label: string }[];

/**
 * 세 보기가 함께 쓰는 첫 줄이다.
 * 보기를 바꿔도 차수·탭·보기 전환이 같은 자리에 있어야 손이 헤매지 않으므로 순서를 고정한다.
 */
export function BoardHeader() {
  const { board, filters, screeningCompleted, setFilters, clearSelection, goToRound, setCompletionPrompt } = useBoard();
  const current = board.rounds.find((state) => state.round === board.round);
  const counts = current?.counts;
  const canComplete = Boolean(
    current && !screeningCompleted && !current.closed && board.role.activeRound === board.round,
  );
  // 심사가 끝난 사람을 한 명씩 넘겨 볼 이유가 없어 그때는 선택지에서 뺀다.
  const views = filters.work === "DONE" ? VIEW_TABS.filter((tab) => tab.view !== "single") : VIEW_TABS;

  const changeWork = (work: WorkMode) => {
    clearSelection();
    setFilters((currentFilters) => ({
      ...currentFilters,
      work,
      status: defaultStatusForWork(work),
      view: viewForWork(work, currentFilters.view),
    }));
  };

  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2 rounded-card border border-border bg-card px-3 py-2">
      <label className="shrink-0">
        <span className="sr-only">전형 차수</span>
        <select
          value={board.round}
          onChange={(event) => goToRound(Number(event.target.value) as RoundNumber)}
          className="min-h-8 rounded-control border border-border bg-card px-1.5 text-xs font-semibold text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
        >
          {board.rounds.map((state) => (
            <option key={state.round} value={state.round}>{roundTitle(state.round, state.name)}</option>
          ))}
        </select>
      </label>

      <div className="flex shrink-0 overflow-hidden rounded-control border border-border bg-card">
        {WORK_TABS.map((tab) => (
          <SegmentButton
            key={tab.mode}
            pressed={filters.work === tab.mode}
            onClick={() => changeWork(tab.mode)}
            className="inline-flex items-center gap-1.5 px-2.5 text-xs"
          >
            {tab.label}
            {counts ? <span className="num font-bold">{tab.mode === "PENDING" ? counts.pending : counts.done}</span> : null}
          </SegmentButton>
        ))}
      </div>

      <div className="flex shrink-0 overflow-hidden rounded-control border border-border bg-card">
        {views.map((tab) => (
          <SegmentButton
            key={tab.view}
            pressed={filters.view === tab.view}
            onClick={() => {
              if (tab.view === "single") clearSelection();
              setFilters((currentFilters) => ({ ...currentFilters, view: tab.view }));
            }}
            className="px-2.5 text-xs"
          >
            {tab.label}
          </SegmentButton>
        ))}
      </div>

      <span className="ml-auto shrink-0 rounded-control border border-pass/30 bg-pass-bg px-2.5 py-1 text-sm font-bold leading-none text-pass">
        합격 <span className="num text-base">{counts?.pass ?? 0}</span>
      </span>

      {screeningCompleted ? (
        <span className="shrink-0 rounded-full bg-pass-bg px-2 py-1 text-xs font-semibold text-pass">전형 종료</span>
      ) : canComplete ? (
        <SecondaryButton onClick={() => setCompletionPrompt("manual")} className="min-h-8 shrink-0 border-brand-line px-2.5 text-xs text-brand">
          전형 마감
        </SecondaryButton>
      ) : null}

      <ApplicationLinkButton postingId={board.posting.id} compact />
    </div>
  );
}

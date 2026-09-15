"use client";

import { defaultStatusForWork, viewForWork, type AuditionFilters, type WorkMode } from "@/features/auditions/filters";
import { roundTitle } from "@/features/auditions/labels";
import type { RoundNumber } from "@/features/auditions/types";
import { SegmentButton } from "@/components/ui/controls";
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
 *
 * 테두리 상자를 겹겹이 쌓지 않는다. 차수는 바꿀 수 있는 제목으로, 동작은 글자 버튼으로 두고
 * 테두리는 전환 스위치에만 남겨서 무엇이 스위치이고 무엇이 동작인지 모양으로 구분되게 한다.
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
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5">
      <label className="relative shrink-0">
        <span className="sr-only">전형 차수</span>
        <select
          value={board.round}
          onChange={(event) => goToRound(Number(event.target.value) as RoundNumber)}
          className="min-h-9 cursor-pointer appearance-none rounded-control bg-transparent py-1 pl-1 pr-6 text-base font-bold tracking-[-0.02em] text-foreground outline-none hover:bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
        >
          {board.rounds.map((state) => (
            <option key={state.round} value={state.round}>{roundTitle(state.round, state.name)}</option>
          ))}
        </select>
        <ChevronDownIcon />
      </label>

      <div className="flex shrink-0 overflow-hidden rounded-control border border-border bg-card">
        {WORK_TABS.map((tab) => (
          <SegmentButton
            key={tab.mode}
            pressed={filters.work === tab.mode}
            onClick={() => changeWork(tab.mode)}
            className="inline-flex items-center gap-1.5 px-3 text-dense"
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
            className="px-3 text-dense"
          >
            {tab.label}
          </SegmentButton>
        ))}
      </div>

      {/* 합격 수는 읽기만 하는 값이라 상자에 담지 않고 글자로 둔다. */}
      <p className="shrink-0 text-dense text-muted">
        합격 <b className="num text-base font-bold text-pass">{counts?.pass ?? 0}</b>
      </p>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        {screeningCompleted ? (
          <span className="px-2 text-dense font-semibold text-pass">전형 종료</span>
        ) : canComplete ? (
          <button
            type="button"
            onClick={() => setCompletionPrompt("manual")}
            className="min-h-9 rounded-control px-3 text-dense font-bold text-brand transition-colors hover:bg-brand-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand"
          >
            전형 마감
          </button>
        ) : null}
        <ApplicationLinkButton postingId={board.posting.id} compact variant="quiet" className="min-h-9 px-3 text-dense" />
      </div>
    </div>
  );
}

function ChevronDownIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      className="pointer-events-none absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 fill-none stroke-muted stroke-[1.8]"
    >
      <path d="m2.5 4.5 3.5 3.5 3.5-3.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

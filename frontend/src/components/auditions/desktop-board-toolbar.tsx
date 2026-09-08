"use client";

import {
  activeDetailFilterCount,
  defaultStatusForWork,
  type StatusFilter,
  type WorkMode,
} from "@/features/auditions/filters";
import { selectableStatuses, STATUS_LABELS } from "@/features/auditions/labels";
import type { ReviewStatus } from "@/features/auditions/types";
import { SegmentButton } from "@/components/ui/controls";
import { useBoard } from "./board-context";
import { FilterIcon } from "./filter-bar";

const WORK_TABS = [
  { mode: "PENDING", label: "검토 대기" },
  { mode: "DONE", label: "검토 완료" },
] as const satisfies readonly { mode: WorkMode; label: string }[];

export function DesktopBoardToolbar({ onOpenFilter }: { onOpenFilter: () => void }) {
  const { filters, visible, setFilters, clearSelection } = useBoard();
  const detailCount = activeDetailFilterCount(filters);
  const changeWork = (work: WorkMode) => {
    clearSelection();
    setFilters((current) => ({
      ...current,
      work,
      status: defaultStatusForWork(work),
    }));
  };

  return (
    <div className="hidden min-h-16 items-center gap-2 px-6 py-2 lg:flex xl:gap-3 xl:px-8">
      <div className="flex shrink-0 overflow-hidden rounded-control border border-border bg-card">
        {WORK_TABS.map((tab) => (
          <SegmentButton
            key={tab.mode}
            pressed={filters.work === tab.mode}
            onClick={() => changeWork(tab.mode)}
            className="gap-1.5 px-2.5 xl:px-3"
          >
            {tab.label}
          </SegmentButton>
        ))}
      </div>

      {filters.work === "DONE" ? (
        <label className="shrink-0">
          <span className="sr-only">심사 결과 상태</span>
          <select
            value={filters.status}
            onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value as StatusFilter }))}
            className="min-h-10 rounded-control border border-border bg-card px-2.5 text-dense font-semibold text-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand-soft"
          >
            {(["ALL", ...selectableStatuses()] as const).map((status) => (
              <option key={status} value={status}>
                {status === "ALL" ? "전체" : STATUS_LABELS[status as ReviewStatus]}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="relative min-w-[132px] max-w-[360px] flex-1">
        <span className="sr-only">배우 검색</span>
        <SearchIcon />
        <input
          type="search"
          value={filters.query}
          onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
          placeholder="이름·학교·연락처 검색"
          className="min-h-10 w-full rounded-control border border-border bg-card py-2 pl-9 pr-8 text-dense text-foreground outline-none placeholder:text-muted-soft hover:border-muted-soft focus:border-brand focus:ring-2 focus:ring-brand-soft"
        />
        {filters.query ? (
          <button
            type="button"
            aria-label="검색어 지우기"
            onClick={() => setFilters((current) => ({ ...current, query: "" }))}
            className="absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-surface hover:text-foreground"
          >
            ×
          </button>
        ) : null}
      </label>

      <span className="num hidden shrink-0 text-xs text-muted 2xl:inline">{visible.length}명 표시</span>
      <button
        type="button"
        aria-pressed={filters.mismatchOnly}
        onClick={() => setFilters((current) => ({ ...current, mismatchOnly: !current.mismatchOnly }))}
        className={`inline-flex min-h-10 shrink-0 items-center rounded-control border px-3 text-dense font-semibold transition-colors ${
          filters.mismatchOnly
            ? "border-brand bg-brand text-white"
            : "border-brand-line bg-brand-soft text-brand hover:border-brand hover:bg-brand-soft-strong"
        }`}
      >
        {filters.mismatchOnly ? "✓ 배역 조건 불일치 적용 중" : "배역 조건 불일치만"}
      </button>
      <button
        type="button"
        aria-haspopup="dialog"
        onClick={onOpenFilter}
        className={`inline-flex min-h-10 shrink-0 items-center gap-1.5 rounded-control border px-3 text-dense font-semibold ${
          detailCount
            ? "border-brand bg-brand-soft text-brand"
            : "border-border bg-card text-muted-strong hover:border-brand-line hover:bg-brand-soft hover:text-brand"
        }`}
      >
        <FilterIcon /> 필터
        {detailCount ? <span className="num">{detailCount}</span> : null}
      </button>

    </div>
  );
}

function SearchIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-muted stroke-[1.7]"><circle cx="8.5" cy="8.5" r="4.5" /><path d="m12 12 4 4" /></svg>;
}

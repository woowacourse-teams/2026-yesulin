"use client";

import { activeDetailFilterCount } from "@/features/auditions/filters";
import { selectableStatuses, STATUS_LABELS } from "@/features/auditions/labels";
import { FilterChip } from "@/components/ui/controls";
import { useBoard } from "./board-context";
import { HorizontalScrollArea } from "./horizontal-scroll-area";

export function FilterBar({ sheetOpen, onOpenSheet }: { sheetOpen: boolean; onOpenSheet: () => void }) {
  const { filters, visible, setFilters } = useBoard();
  const activeCount = activeDetailFilterCount(filters);

  return (
    <div className="border-b border-border bg-transparent lg:hidden">
      <div className="flex min-h-14 items-center gap-3 px-4 py-2">
        {filters.work === "DONE" ? (
          <HorizontalScrollArea className="min-w-0 flex-1" scrollerClassName="pr-8">
            <div className="flex min-w-max gap-1.5">
              {(["ALL", ...selectableStatuses()] as const).map((status) => (
                <FilterChip
                  key={status}
                  pressed={filters.status === status}
                  onClick={() => setFilters((current) => ({ ...current, status }))}
                >
                  {status === "ALL" ? "전체" : STATUS_LABELS[status]}
                </FilterChip>
              ))}
            </div>
          </HorizontalScrollArea>
        ) : (
          <span className="min-w-0 flex-1 text-sm text-muted">
            <strong className="num text-foreground">{visible.length}명</strong> 표시 중
          </span>
        )}
        <button
          type="button"
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          onClick={onOpenSheet}
          className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-control border px-3 text-sm font-semibold ${
            activeCount
              ? "border-brand bg-brand-soft text-brand"
              : "border-border bg-card text-muted-strong"
          }`}
        >
          <FilterIcon />필터
          {activeCount ? (
            <span className="num grid h-5 min-w-5 place-items-center rounded-full bg-brand px-1 text-xs text-white">
              {activeCount}
            </span>
          ) : null}
        </button>
      </div>
      <div className="flex px-4 pb-2">
        <button
          type="button"
          aria-pressed={filters.mismatchOnly}
          onClick={() => setFilters((current) => ({ ...current, mismatchOnly: !current.mismatchOnly }))}
          className={`inline-flex min-h-10 items-center rounded-control border px-3 text-sm font-semibold transition-colors ${
            filters.mismatchOnly
              ? "border-brand bg-brand text-white"
              : "border-brand-line bg-brand-soft text-brand"
          }`}
        >
          {filters.mismatchOnly ? "✓ 배역 조건 불일치 적용 중" : "배역 조건 불일치만"}
        </button>
      </div>
    </div>
  );
}

export function FilterIcon() {
  return <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4 fill-none stroke-current stroke-[1.7]"><path d="M3 5h14M6 10h8M8.5 15h3" /></svg>;
}

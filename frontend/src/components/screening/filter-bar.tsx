"use client";

import { useMemo } from "react";
import {
  countMismatches,
  emptyNumeric,
  NUMERIC_FIELDS,
  NUMERIC_FIELD_META,
  type NumericField,
} from "@/features/screening/filters";
import { selectableStatuses, STATUS_LABELS } from "@/features/screening/labels";
import type { Gender, ReviewStatus } from "@/features/screening/types";
import { useBoard } from "./board-context";
import { FilterChip, SegmentButton, TextButton, WarningFilterChip } from "./ui-controls";

export function FilterBar() {
  const { board, filters, setFilters } = useBoard();
  const counts = board.rounds.find((state) => state.round === board.round)?.counts;
  const mismatches = useMemo(
    () => countMismatches(board.applicants, filters),
    [board.applicants, filters],
  );

  const countOf = (status: ReviewStatus | "ALL") => {
    if (!counts) return 0;
    if (status === "ALL") return counts.done;
    return { PASS: counts.pass, FAIL: counts.fail, ABSENT: counts.absent, ETC: counts.etc, PENDING: counts.pending }[
      status
    ];
  };

  const toggleGender = (gender: Gender) =>
    setFilters((current) => {
      const genders = new Set(current.genders);
      if (genders.has(gender)) genders.delete(gender);
      else genders.add(gender);
      return { ...current, genders };
    });

  return (
    <div className="scrollbar-compact overflow-x-auto border-b border-border bg-transparent">
      <div className="flex min-w-max items-center gap-2 px-4 py-2.5 md:px-6">
        {filters.work === "DONE" ? (
        <>
          <div className="flex gap-1.5">
            {(["ALL", ...selectableStatuses(board.round)] as const).map((status) => (
              <FilterChip
                key={status}
                pressed={filters.status === status}
                onClick={() => setFilters((current) => ({ ...current, status }))}
              >
                {status === "ALL" ? "전체" : STATUS_LABELS[status]}
                <span className="num ml-1 opacity-55">{countOf(status)}</span>
              </FilterChip>
            ))}
          </div>
          <span aria-hidden="true" className="mx-1 h-6 w-px bg-border" />
        </>
      ) : null}

      <div className="flex gap-1.5">
        {(["FEMALE", "MALE"] as const).map((gender) => (
          <FilterChip
            key={gender}
            pressed={filters.genders.has(gender)}
            title={gender === "FEMALE" ? "여성" : "남성"}
            onClick={() => toggleGender(gender)}
            className="w-11 px-0"
          >
            {gender === "FEMALE" ? "여" : "남"}
          </FilterChip>
        ))}
      </div>

      {NUMERIC_FIELDS.map((field) => (
        <NumericFilter key={field} field={field} />
      ))}

      <span aria-hidden="true" className="mx-1 h-6 w-px bg-border" />

      <WarningFilterChip
        pressed={filters.mismatchOnly}
        title="배역이 명시한 성별·나이 조건을 벗어난 지원자만 봅니다"
        onClick={() => setFilters((current) => ({ ...current, mismatchOnly: !current.mismatchOnly }))}
      >
        조건 불일치만<span className="num ml-1 opacity-55">{mismatches}</span>
      </WarningFilterChip>

      <TextButton
        onClick={() =>
          setFilters((current) => ({
            ...current,
            genders: new Set(),
            numeric: emptyNumeric(),
            mismatchOnly: false,
          }))
        }
        className="min-h-9 px-2 text-[13px]"
      >
        초기화
      </TextButton>

      <div className="ml-2 flex items-center">
        <div className="flex overflow-hidden rounded-control border border-border bg-card">
          {(["card", "table"] as const).map((view) => (
            <SegmentButton
              key={view}
              pressed={filters.view === view}
              onClick={() => setFilters((current) => ({ ...current, view }))}
            >
              {view === "card" ? "카드" : "표"}
            </SegmentButton>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}

function NumericFilter({ field }: { field: NumericField }) {
  const { filters, setFilters } = useBoard();
  const meta = NUMERIC_FIELD_META[field];
  const condition = filters.numeric[field];

  const update = (next: (typeof filters)["numeric"][NumericField]) =>
    setFilters((current) => ({ ...current, numeric: { ...current.numeric, [field]: next } }));

  if (!condition) {
    return (
      <button
        type="button"
        onClick={() => update({ op: "gte", value: meta.initial })}
        className="min-h-9 whitespace-nowrap rounded-full border border-dashed border-muted-soft bg-card px-3 py-1.5 text-[13px] font-semibold text-muted-strong before:text-muted before:content-['+_'] hover:border-brand-line hover:bg-brand-soft hover:text-brand"
      >
        {meta.label}
      </button>
    );
  }

  return (
    <span className="inline-flex min-h-9 items-center gap-1.5 whitespace-nowrap rounded-full border border-brand-line bg-brand-soft py-1 pl-3 pr-1.5 text-[13px] text-brand">
      <span className="font-semibold">{meta.label}</span>
      <input
        type="number"
        aria-label={`${meta.label} 기준값`}
        value={condition.value}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          if (!Number.isNaN(parsed)) update({ ...condition, value: parsed });
        }}
        className="num w-14 rounded-lg border border-border bg-card px-1.5 py-1 text-right text-[13px] text-foreground"
      />
      <span className="text-muted">{meta.unit}</span>
      <select
        aria-label={`${meta.label} 비교 방향`}
        value={condition.op}
        onChange={(event) => update({ ...condition, op: event.target.value === "lte" ? "lte" : "gte" })}
        className="rounded-lg border border-border bg-card px-1.5 py-1 text-xs text-foreground"
      >
        <option value="gte">이상</option>
        <option value="lte">이하</option>
      </select>
      <button
        type="button"
        aria-label={`${meta.label} 조건 제거`}
        onClick={() => update(null)}
        className="rounded-full px-2 py-1 text-xs leading-none text-muted-strong hover:bg-white hover:text-fail"
      >
        삭제
      </button>
    </span>
  );
}

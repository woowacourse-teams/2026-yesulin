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

const chipBase =
  "rounded-full border px-2.5 py-1 text-[12.5px] transition-colors disabled:cursor-not-allowed";

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
    <div className="flex flex-wrap items-center gap-[9px] border-b border-border bg-card px-4 py-[9px] md:px-6">
      {filters.work === "DONE" ? (
        <>
          <div className="flex flex-wrap gap-[5px]">
            {(["ALL", ...selectableStatuses(board.round)] as const).map((status) => (
              <button
                key={status}
                type="button"
                aria-pressed={filters.status === status}
                onClick={() => setFilters((current) => ({ ...current, status }))}
                className={`${chipBase} ${
                  filters.status === status
                    ? "border-foreground bg-foreground font-medium text-white"
                    : "border-border bg-card text-muted-strong hover:border-muted-soft"
                }`}
              >
                {status === "ALL" ? "전체" : STATUS_LABELS[status]}
                <span className="num ml-1 opacity-55">{countOf(status)}</span>
              </button>
            ))}
          </div>
          <span aria-hidden="true" className="mx-[3px] h-[19px] w-px bg-border-soft" />
        </>
      ) : null}

      <div className="flex gap-1">
        {(["FEMALE", "MALE"] as const).map((gender) => (
          <button
            key={gender}
            type="button"
            aria-pressed={filters.genders.has(gender)}
            title={gender === "FEMALE" ? "여성" : "남성"}
            onClick={() => toggleGender(gender)}
            className={`grid h-[29px] w-[34px] place-items-center rounded-control border text-[15px] leading-none transition-colors ${
              filters.genders.has(gender)
                ? "border-foreground bg-foreground text-white"
                : "border-border bg-card text-muted"
            }`}
          >
            {gender === "FEMALE" ? "여" : "남"}
          </button>
        ))}
      </div>

      {NUMERIC_FIELDS.map((field) => (
        <NumericFilter key={field} field={field} />
      ))}

      <span aria-hidden="true" className="mx-[3px] h-[19px] w-px bg-border-soft" />

      <button
        type="button"
        aria-pressed={filters.mismatchOnly}
        title="배역이 명시한 성별·나이 조건을 벗어난 지원자만 봅니다"
        onClick={() => setFilters((current) => ({ ...current, mismatchOnly: !current.mismatchOnly }))}
        className={`${chipBase} ${
          filters.mismatchOnly
            ? "border-warn bg-warn font-medium text-white"
            : "border-warn-bg bg-card text-muted-strong hover:border-warn"
        }`}
      >
        조건 불일치만<span className="num ml-1 opacity-55">{mismatches}</span>
      </button>

      <button
        type="button"
        onClick={() =>
          setFilters((current) => ({
            ...current,
            genders: new Set(),
            numeric: emptyNumeric(),
            mismatchOnly: false,
          }))
        }
        className="text-[12.5px] text-muted underline underline-offset-2"
      >
        초기화
      </button>

      <div className="ml-auto flex items-center gap-2.5">
        <div className="flex overflow-hidden rounded-control border border-border">
          {(["card", "table"] as const).map((view) => (
            <button
              key={view}
              type="button"
              aria-pressed={filters.view === view}
              onClick={() => setFilters((current) => ({ ...current, view }))}
              className={`px-[11px] py-1 text-[12.5px] ${
                filters.view === view ? "bg-foreground font-medium text-white" : "bg-card text-muted-strong"
              }`}
            >
              {view === "card" ? "카드" : "표"}
            </button>
          ))}
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
        className="whitespace-nowrap rounded-full border border-dashed border-muted-soft bg-card px-[11px] py-[5px] text-[12.5px] text-muted-strong before:text-muted before:content-['+_'] hover:border-muted hover:text-foreground"
      >
        {meta.label}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-[5px] whitespace-nowrap rounded-full border border-foreground bg-card py-[3px] pl-[11px] pr-[5px] text-[12.5px]">
      <span className="font-semibold">{meta.label}</span>
      <input
        type="number"
        aria-label={`${meta.label} 기준값`}
        value={condition.value}
        onChange={(event) => {
          const parsed = Number(event.target.value);
          if (!Number.isNaN(parsed)) update({ ...condition, value: parsed });
        }}
        className="num w-12 rounded bg-surface px-[5px] py-[3px] text-right text-[12.5px]"
      />
      <span className="text-muted">{meta.unit}</span>
      <select
        aria-label={`${meta.label} 비교 방향`}
        value={condition.op}
        onChange={(event) => update({ ...condition, op: event.target.value === "lte" ? "lte" : "gte" })}
        className="rounded bg-surface px-1 py-0.5 text-xs"
      >
        <option value="gte">이상</option>
        <option value="lte">이하</option>
      </select>
      <button
        type="button"
        aria-label={`${meta.label} 조건 제거`}
        onClick={() => update(null)}
        className="px-1.5 py-0.5 text-[11px] leading-none text-muted"
      >
        삭제
      </button>
    </span>
  );
}

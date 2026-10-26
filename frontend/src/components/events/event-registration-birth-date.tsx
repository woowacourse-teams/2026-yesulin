"use client";

import { useState } from "react";
import { FieldSelect } from "@/components/ui/controls";
import { RequiredMark } from "./event-registration-field";

const MONTHS = Array.from({ length: 12 }, (_, index) => index + 1);

/**
 * 생년월일을 연·월·일 고르기로 받는다. 휴대폰 날짜 칸은 비어 보이거나 화면 밖으로 넘치는 일이 있어 쓰지 않는다.
 * 셋을 모두 골라야 `YYYY-MM-DD`를 넘기고, 아니면 빈 문자열을 넘긴다.
 */
export function BirthDateField({ value, today, onChange }: {
  readonly value: string;
  readonly today: string;
  readonly onChange: (value: string) => void;
}) {
  const [parts, setParts] = useState(() => {
    const [year = "", month = "", day = ""] = value ? value.split("-") : [];
    return { year, month, day };
  });
  const thisYear = Number(today.slice(0, 4));
  const years = Array.from({ length: thisYear - 1939 }, (_, index) => String(thisYear - index));
  const lastDay = parts.year && parts.month ? new Date(Number(parts.year), Number(parts.month), 0).getDate() : 31;

  const choose = (patch: Partial<typeof parts>) => {
    const next = { ...parts, ...patch };
    const days = next.year && next.month ? new Date(Number(next.year), Number(next.month), 0).getDate() : 31;
    if (next.day && Number(next.day) > days) next.day = "";
    setParts(next);
    onChange(next.year && next.month && next.day ? `${next.year}-${next.month}-${next.day}` : "");
  };

  return (
    <fieldset className="flex min-w-0 flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-semibold">생년월일<RequiredMark /></legend>
      <div className="grid grid-cols-[1.3fr_1fr_1fr] gap-2">
        <FieldSelect className="!px-2" aria-label="태어난 연도" value={parts.year} onChange={(event) => choose({ year: event.target.value })}>
          <option value="">연도</option>
          {years.map((year) => <option key={year} value={year}>{year}년</option>)}
        </FieldSelect>
        <FieldSelect className="!px-2" aria-label="태어난 월" value={parts.month} onChange={(event) => choose({ month: event.target.value })}>
          <option value="">월</option>
          {MONTHS.map((month) => <option key={month} value={String(month).padStart(2, "0")}>{month}월</option>)}
        </FieldSelect>
        <FieldSelect className="!px-2" aria-label="태어난 일" value={parts.day} onChange={(event) => choose({ day: event.target.value })}>
          <option value="">일</option>
          {Array.from({ length: lastDay }, (_, index) => index + 1).map((day) => (
            <option key={day} value={String(day).padStart(2, "0")}>{day}일</option>
          ))}
        </FieldSelect>
      </div>
    </fieldset>
  );
}

"use client";

import { FieldInput } from "./controls";

/**
 * 생년월일은 캘린더 대신 숫자로 받는다.
 * 지난 날짜를 캘린더로 고르면 월을 여러 번 넘겨야 해서 입력이 오래 걸린다.
 * 화면에는 숫자만 보여 주고 저장은 다른 날짜 항목과 같은 YYYY-MM-DD 형식으로 한다.
 */
export function BirthDateInput({ id, value, required, invalid, describedBy, onChange }: {
  readonly id: string;
  readonly value: string;
  readonly required: boolean;
  readonly invalid: boolean;
  readonly describedBy?: string;
  readonly onChange: (value: string) => void;
}) {
  const hintId = `${id}-birth-hint`;
  return <>
    <FieldInput
      id={id}
      type="text"
      inputMode="numeric"
      autoComplete="bday"
      maxLength={8}
      value={birthDigits(value)}
      placeholder="19990315"
      required={required}
      aria-invalid={invalid || undefined}
      aria-describedby={[hintId, describedBy ?? ""].filter(Boolean).join(" ")}
      onChange={(event) => onChange(toBirthDate(event.target.value))}
    />
    <p id={hintId} className="mt-2 text-xs leading-5 text-muted">연도부터 숫자 8자리로 입력해 주세요. 예: 19990315</p>
  </>;
}

/** 저장 형식과 입력 중인 값 모두에서 숫자만 남긴다. */
export function birthDigits(value: string) {
  return value.replace(/\D/g, "").slice(0, 8);
}

/** 8자리를 채우면 저장 형식으로 옮기고, 그전에는 입력 중인 숫자를 그대로 둔다. */
export function toBirthDate(input: string) {
  const digits = birthDigits(input);
  return digits.length < 8 ? digits : `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
}

/** 달력이 막아 주던 잘못된 날짜를 직접 걸러 낸다. */
export function isValidBirthDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

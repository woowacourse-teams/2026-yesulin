import type { AuditionRoundInput } from "./creation-types";

const KOREA_OFFSET = "+09:00";
const KOREA_OFFSET_MILLISECONDS = 9 * 60 * 60 * 1_000;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

export type AuditionDateField =
  | "performanceStart"
  | "performanceEnd"
  | "recruitmentStart"
  | "recruitmentEnd"
  | `round.${number}.date`;

export type AuditionDateIssue = {
  readonly code: string;
  readonly field: AuditionDateField;
  readonly message: string;
};

export type AuditionDateInput = {
  readonly performanceStart: string;
  readonly performanceEnd: string;
  readonly recruitmentStart: string;
  readonly recruitmentEnd: string;
  readonly rounds: readonly Pick<AuditionRoundInput, "date">[];
};

export function validateAuditionDates(input: AuditionDateInput, now = new Date()): readonly AuditionDateIssue[] {
  const issues: AuditionDateIssue[] = [];
  const add = (issue: AuditionDateIssue) => {
    if (!issues.some((candidate) => candidate.field === issue.field)) issues.push(issue);
  };

  if (!isValidDate(input.performanceStart)) {
    add({ code: "PERFORMANCE_START_REQUIRED", field: "performanceStart", message: "공연 시작일을 선택해 주세요." });
  }
  if (input.performanceEnd && !isValidDate(input.performanceEnd)) {
    add({ code: "INVALID_PERFORMANCE_PERIOD", field: "performanceEnd", message: "공연 종료일을 다시 선택해 주세요." });
  }
  if (isValidDate(input.performanceStart) && isValidDate(input.performanceEnd)
    && input.performanceEnd < input.performanceStart) {
    add({ code: "INVALID_PERFORMANCE_PERIOD", field: "performanceEnd", message: "공연 종료일은 시작일보다 빠를 수 없습니다." });
  }

  if (!isValidDateTime(input.recruitmentEnd)) {
    add({ code: "PERIOD_REQUIRED", field: "recruitmentEnd", message: "모집 마감 날짜와 시간을 선택해 주세요." });
  }
  if (isValidDateTime(input.recruitmentEnd) && koreaInstantMilliseconds(input.recruitmentEnd) <= now.getTime()) {
    add({ code: "RECRUITMENT_END_PAST", field: "recruitmentEnd", message: "모집 종료 시각은 현재보다 이후여야 합니다." });
  }
  if (isValidDateTime(input.recruitmentEnd) && isValidDate(input.performanceEnd)
    && nextDate(datePart(input.recruitmentEnd)) > input.performanceEnd) {
    add({
      code: "INVALID_ROUND_DATE",
      field: "recruitmentEnd",
      message: "모집 마감 다음 날이 공연 종료일을 넘습니다. 모집 기간이나 공연 종료일을 조정해 주세요.",
    });
  }

  input.rounds.forEach((round, index) => {
    const field = roundField(index);
    if (!isValidDate(round.date)) {
      add({ code: "INVALID_ROUND_DATE", field, message: `${index + 1}차 전형일을 선택해 주세요.` });
    }
  });

  const firstStageDate = input.rounds[0]?.date ?? "";
  if (isValidDate(firstStageDate) && isValidDateTime(input.recruitmentEnd)
    && firstStageDate <= datePart(input.recruitmentEnd)) {
    add({ code: "INVALID_ROUND_DATE", field: roundField(0), message: "1차 전형일은 모집 마감 다음 날부터 선택할 수 있습니다." });
  }
  for (let index = 1; index < input.rounds.length; index += 1) {
    const previous = input.rounds[index - 1]!.date;
    const current = input.rounds[index]!.date;
    if (isValidDate(previous) && isValidDate(current) && current < previous) {
      add({ code: "INVALID_ROUND_DATE", field: roundField(index), message: `${index + 1}차 전형일은 이전 차수보다 빠를 수 없습니다.` });
    }
  }
  if (isValidDate(input.performanceEnd)) {
    input.rounds.forEach((round, index) => {
      if (isValidDate(round.date) && round.date > input.performanceEnd) {
        add({ code: "ROUND_AFTER_PERFORMANCE_END", field: roundField(index), message: "전형일은 공연 종료일보다 늦을 수 없습니다." });
      }
    });
  }
  return issues;
}

export function auditionDateWarnings(input: AuditionDateInput, now = new Date()): readonly string[] {
  const warnings: string[] = [];
  if (isValidDate(input.performanceStart) && input.performanceStart < koreaToday(now)) {
    warnings.push("공연 시작일이 이미 지났습니다. 진행 중인 공연의 추가 캐스팅인지 확인해 주세요.");
  }
  if (isValidDate(input.performanceStart)
    && input.rounds.some((round) => isValidDate(round.date) && round.date > input.performanceStart)) {
    warnings.push("공연 시작일 이후 전형이 있습니다. 공연 중 추가 캐스팅 일정이 맞는지 확인해 주세요.");
  }
  return warnings;
}

export function stageMinimumDate(input: AuditionDateInput, index: number): string | undefined {
  if (index > 0 && isValidDate(input.rounds[index - 1]?.date ?? "")) return input.rounds[index - 1]!.date;
  if (index === 0 && isValidDateTime(input.recruitmentEnd)) return nextDate(datePart(input.recruitmentEnd));
  return undefined;
}

export function toKoreaInstant(value: string): string {
  if (!isValidDateTime(value)) throw new Error("한국 시간 형식이 올바르지 않습니다.");
  return new Date(`${value}:00${KOREA_OFFSET}`).toISOString();
}

export function toKoreaLocalDateTime(value?: string): string {
  if (!value) return "";
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return "";
  return new Date(instant.getTime() + KOREA_OFFSET_MILLISECONDS).toISOString().slice(0, 16);
}

function isValidDate(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
}

function isValidDateTime(value: string): boolean {
  const match = DATE_TIME_PATTERN.exec(value);
  if (!match) return false;
  const [, year, month, day, hour, minute] = match.map(Number);
  return isValidDate(`${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`)
    && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function koreaInstantMilliseconds(value: string) {
  return new Date(`${value}:00${KOREA_OFFSET}`).getTime();
}

function koreaToday(now: Date) {
  return new Date(now.getTime() + KOREA_OFFSET_MILLISECONDS).toISOString().slice(0, 10);
}

function datePart(value: string) {
  return value.slice(0, 10);
}

function nextDate(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function roundField(index: number): `round.${number}.date` {
  return `round.${index}.date`;
}

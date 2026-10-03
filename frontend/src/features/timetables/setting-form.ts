import { addDays, compareWindows, hmOf, minutesOf } from "./time";
import { TIMETABLE_LIMITS, type TimetableSetting, type TimetableWindow } from "./types";

export type WindowForm = {
  readonly id: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
};

/** 입력 중인 값은 문자열로 들고 있다가 저장할 때 숫자로 바꾼다. */
export type SettingForm = {
  readonly slotMinutes: string;
  readonly slotCapacity: string;
  readonly windows: readonly WindowForm[];
};

export type SettingFormErrors = Readonly<Record<string, string>>;

export type TimeRange = {
  readonly startTime: string;
  readonly endTime: string;
};

export const DEFAULT_TIME_RANGE: TimeRange = { startTime: "10:00", endTime: "18:00" };

let windowSequence = 0;
const nextWindowId = () => {
  windowSequence += 1;
  return `window-${windowSequence}`;
};

/** 입력 중인 시간 범위. 화면 목록의 key로 쓰도록 id를 붙인다. */
export type RangeForm = TimeRange & { readonly id: string };

export const toRangeForm = (range: TimeRange): RangeForm => ({ id: nextWindowId(), startTime: range.startTime, endTime: range.endTime });

export function settingFormFrom(setting: TimetableSetting): SettingForm {
  return {
    slotMinutes: String(setting.slotMinutes),
    slotCapacity: String(setting.slotCapacity),
    windows: [...setting.windows].sort(compareWindows).map((window) => ({ id: nextWindowId(), ...window })),
  };
}

export function emptySettingForm(): SettingForm {
  return { slotMinutes: "20", slotCapacity: "1", windows: [] };
}

export function selectedDates(form: SettingForm): string[] {
  return [...new Set(form.windows.map((window) => window.date))].sort();
}

/** 한 날짜의 시간 범위. 입력 중 순서가 바뀌지 않도록 넣은 순서를 지킨다. */
export function rangesOf(form: SettingForm, date: string): WindowForm[] {
  return form.windows.filter((window) => window.date === date);
}

const sameRanges = (left: readonly TimeRange[], right: readonly TimeRange[]) =>
  left.length === right.length
  && left.every((range, index) => range.startTime === right[index].startTime && range.endTime === right[index].endTime);

/** 전체 오디션 가능 시간과 다른 시간을 가진 날짜. 아래 목록에서 따로 고친 날짜다. */
export function customDates(form: SettingForm, common: readonly TimeRange[]): string[] {
  return selectedDates(form).filter((date) => !sameRanges(rangesOf(form, date), common));
}

/** 불러온 시간대에서 가장 많은 날짜가 쓰는 시간 묶음을 전체 오디션 가능 시간으로 삼는다. 없으면 10:00~18:00이다. */
export function commonRangesOf(form: SettingForm): RangeForm[] {
  const counts = new Map<string, { count: number; ranges: TimeRange[] }>();
  for (const date of selectedDates(form)) {
    const ranges = rangesOf(form, date);
    const key = ranges.map((range) => `${range.startTime}-${range.endTime}`).join(",");
    counts.set(key, { count: (counts.get(key)?.count ?? 0) + 1, ranges });
  }
  const best = [...counts.values()].sort((left, right) => right.count - left.count)[0];
  return (best?.ranges ?? [DEFAULT_TIME_RANGE]).map(toRangeForm);
}

/** 두 날짜 사이(양 끝 포함)의 날짜. 순서는 상관없다. */
export function datesBetween(from: string, to: string): string[] {
  const [start, end] = from <= to ? [from, to] : [to, from];
  const dates: string[] = [];
  for (let date = start; date <= end; date = addDays(date, 1)) dates.push(date);
  return dates;
}

/** 아직 고르지 않은 날짜를 전체 오디션 가능 시간으로 연다. 이미 고른 날짜의 시간은 그대로 둔다. */
export function selectDates(form: SettingForm, dates: readonly string[], common: readonly TimeRange[]): SettingForm {
  const selected = new Set(selectedDates(form));
  const added = dates
    .filter((date) => !selected.has(date))
    .flatMap((date) => common.map((range) => ({ id: nextWindowId(), date, startTime: range.startTime, endTime: range.endTime })));
  return { ...form, windows: [...form.windows, ...added] };
}

export function removeDates(form: SettingForm, dates: readonly string[]): SettingForm {
  const removed = new Set(dates);
  return { ...form, windows: form.windows.filter((window) => !removed.has(window.date)) };
}

/** 날짜들의 시간을 주어진 범위로 바꾼다. 개별 날짜를 전체 시간으로 되돌릴 때도 쓴다. */
export function setDateRanges(form: SettingForm, dates: readonly string[], ranges: readonly TimeRange[]): SettingForm {
  const targets = new Set(dates);
  const kept = form.windows.filter((window) => !targets.has(window.date));
  const replaced = selectedDates(form)
    .filter((date) => targets.has(date))
    .flatMap((date) => ranges.map((range) => ({ id: nextWindowId(), date, startTime: range.startTime, endTime: range.endTime })));
  return { ...form, windows: [...kept, ...replaced] };
}

/** 전체 오디션 가능 시간을 바꾸면 그 시간을 따르던 날짜만 함께 바뀌고 따로 고친 날짜는 그대로 남는다. */
export function changeCommonRanges(form: SettingForm, previous: readonly TimeRange[], next: readonly TimeRange[]): SettingForm {
  const following = selectedDates(form).filter((date) => sameRanges(rangesOf(form, date), previous));
  return setDateRanges(form, following, next);
}

/** 쉬는 시간을 두고 범위를 하나 더 만든다. 마지막 범위가 끝난 1시간 뒤부터 2시간이다. */
export function nextRange(ranges: readonly TimeRange[]): TimeRange {
  const last = ranges.at(-1);
  const lastEnd = last && isValidTime(last.endTime) ? minutesOf(last.endTime) : null;
  const start = Math.min(lastEnd === null ? minutesOf(DEFAULT_TIME_RANGE.startTime) : lastEnd + 60, 21 * 60);
  return { startTime: hmOf(start), endTime: hmOf(Math.min(start + 120, 23 * 60 + 55)) };
}

export function addRange(form: SettingForm, date: string): SettingForm {
  return { ...form, windows: [...form.windows, { id: nextWindowId(), date, ...nextRange(rangesOf(form, date)) }] };
}

export function updateRange(form: SettingForm, id: string, patch: Partial<TimeRange>): SettingForm {
  return { ...form, windows: form.windows.map((window) => (window.id === id ? { ...window, ...patch } : window)) };
}

export function removeRange(form: SettingForm, id: string): SettingForm {
  return { ...form, windows: form.windows.filter((window) => window.id !== id) };
}

/** 직접 입력한 시각을 HH:mm으로 맞춘다. 9 → 09:00, 930 → 09:30, 1000 → 10:00. 알 수 없으면 그대로 둔다. */
export function normalizeTimeInput(raw: string): string {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) return trimmed;
  const hour = Number(match[1]);
  const minute = Number(match[2] ?? "0");
  if (hour > 23 || minute > 59) return trimmed;
  return hmOf(hour * 60 + minute);
}

const isValidTime = (time: string) => {
  const match = time.match(/^(\d{2}):(\d{2})$/);
  return Boolean(match) && Number(match![1]) < 24 && Number(match![2]) < 60;
};

/** 오디션 가능 시간 하나를 넣기 전에 검사한다. 형식·순서·진행 시간보다 짧은지·다른 시간과 겹치는지 본다. */
export function checkRange(range: TimeRange, others: readonly TimeRange[], slotMinutes: string): string | null {
  const minutes = Number(slotMinutes);
  const message = windowError({ id: "", date: "", ...range }, Number.isInteger(minutes) && minutes > 0 ? minutes : null);
  if (message) return message;
  const overlapping = others.some((other) => isValidTime(other.startTime) && isValidTime(other.endTime)
    && minutesOf(other.startTime) < minutesOf(range.endTime) && minutesOf(range.startTime) < minutesOf(other.endTime));
  return overlapping ? "다른 시간과 겹쳐요." : null;
}

export function sortRanges<T extends TimeRange>(ranges: readonly T[]): T[] {
  return [...ranges].sort((left, right) => minutesOf(left.startTime) - minutesOf(right.startTime));
}

/** 서버와 같은 규칙으로 검사해 잘못된 항목을 한 번에 모두 알려 준다. */
export function readSettingForm(form: SettingForm): { setting: TimetableSetting | null; errors: SettingFormErrors } {
  const errors: Record<string, string> = {};
  const slotMinutes = Number(form.slotMinutes);
  const slotCapacity = Number(form.slotCapacity);
  if (!Number.isInteger(slotMinutes) || slotMinutes < TIMETABLE_LIMITS.minSlotMinutes
    || slotMinutes > TIMETABLE_LIMITS.maxSlotMinutes || slotMinutes % TIMETABLE_LIMITS.minuteStep !== 0) {
    errors.slotMinutes = `5분 단위로 ${TIMETABLE_LIMITS.maxSlotMinutes}분 이하로 정해 주세요.`;
  }
  if (!Number.isInteger(slotCapacity) || slotCapacity < 1 || slotCapacity > TIMETABLE_LIMITS.maxSlotCapacity) {
    errors.slotCapacity = `1명 이상 ${TIMETABLE_LIMITS.maxSlotCapacity}명 이하로 정해 주세요.`;
  }
  if (form.windows.length === 0) errors.windows = "오디션 날짜를 하나 이상 골라 주세요.";
  if (form.windows.length > TIMETABLE_LIMITS.maxWindows) {
    errors.windows = `시간대는 ${TIMETABLE_LIMITS.maxWindows}개까지 정할 수 있어요.`;
  }
  for (const window of form.windows) {
    const message = windowError(window, errors.slotMinutes ? null : slotMinutes);
    if (message) errors[window.id] = message;
  }
  const valid = form.windows.filter((window) => !errors[window.id]);
  for (const window of valid) {
    const overlapping = valid.find((other) => other.id !== window.id && other.date === window.date
      && minutesOf(other.startTime) < minutesOf(window.endTime) && minutesOf(window.startTime) < minutesOf(other.endTime));
    if (overlapping) errors[window.id] = "같은 날 다른 시간과 겹쳐요.";
  }
  if (Object.keys(errors).length > 0) return { setting: null, errors };
  const windows: TimetableWindow[] = form.windows
    .map(({ date, startTime, endTime }) => ({ date, startTime, endTime }))
    .sort(compareWindows);
  return { setting: { slotMinutes, slotCapacity, windows }, errors };
}

function windowError(window: WindowForm, slotMinutes: number | null): string | null {
  if (!window.startTime || !window.endTime) return "시작·끝 시각을 적어 주세요.";
  if (!isValidTime(window.startTime) || !isValidTime(window.endTime)) return "시각은 10:00처럼 적어 주세요.";
  if (minutesOf(window.startTime) % TIMETABLE_LIMITS.minuteStep !== 0 || minutesOf(window.endTime) % TIMETABLE_LIMITS.minuteStep !== 0) {
    return "시각은 5분 단위로 적어 주세요.";
  }
  if (minutesOf(window.startTime) >= minutesOf(window.endTime)) return "끝나는 시각이 시작 시각보다 늦어야 해요.";
  if (slotMinutes && minutesOf(window.endTime) - minutesOf(window.startTime) < slotMinutes) {
    return `오디션 진행 시간(${slotMinutes}분)보다 길게 정해 주세요.`;
  }
  return null;
}

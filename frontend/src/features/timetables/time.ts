import type { TimeSlot, TimetableSetting, TimetableWindow } from "./types";

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** 서버의 `10:00:00`과 화면의 `10:00`을 같은 값으로 맞춘다. */
export function toHm(time: string): string {
  return time.slice(0, 5);
}

export function minutesOf(time: string): number {
  const [hour, minute] = toHm(time).split(":").map(Number);
  return hour * 60 + minute;
}

export function hmOf(minutes: number): string {
  const hour = Math.floor(minutes / 60);
  const minute = minutes % 60;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

export function slotKey(slot: TimeSlot): string {
  return `${slot.date}T${toHm(slot.startTime)}`;
}

export function slotFromKey(key: string): TimeSlot {
  const [date, startTime] = key.split("T");
  return { date, startTime };
}

export function sameSlot(left: TimeSlot | null, right: TimeSlot | null): boolean {
  if (!left || !right) return left === right;
  return slotKey(left) === slotKey(right);
}

export function compareSlots(left: TimeSlot, right: TimeSlot): number {
  return slotKey(left).localeCompare(slotKey(right));
}

export function compareWindows(left: TimetableWindow, right: TimetableWindow): number {
  return left.date.localeCompare(right.date) || minutesOf(left.startTime) - minutesOf(right.startTime);
}

/** 서버와 같은 규칙으로 시간대마다 시작 시각부터 소요 시간 간격의 칸을 만든다. 끝이 시간대를 넘는 칸은 없다. */
export function slotsOf(setting: Pick<TimetableSetting, "slotMinutes" | "windows">): TimeSlot[] {
  if (setting.slotMinutes <= 0) return [];
  return [...setting.windows]
    .flatMap((window) => {
      const slots: TimeSlot[] = [];
      const end = minutesOf(window.endTime);
      for (let start = minutesOf(window.startTime); start + setting.slotMinutes <= end; start += setting.slotMinutes) {
        slots.push({ date: window.date, startTime: hmOf(start) });
      }
      return slots;
    })
    .sort(compareSlots);
}

export function slotEndTime(slot: TimeSlot, slotMinutes: number): string {
  return hmOf(minutesOf(slot.startTime) + slotMinutes);
}

function weekdayOf(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()];
}

/** 예: 10월 10일 (토) */
export function formatDate(date: string): string {
  const [, month, day] = date.split("-").map(Number);
  return `${month}월 ${day}일 (${weekdayOf(date)})`;
}

/** 예: 10/10 토 */
export function formatShortDate(date: string): string {
  const [, month, day] = date.split("-").map(Number);
  return `${month}/${day} ${weekdayOf(date)}`;
}

/** 예: 10월 10일 (토) 10:00 */
export function formatSlot(slot: TimeSlot): string {
  return `${formatDate(slot.date)} ${toHm(slot.startTime)}`;
}

/** 예: 10월 10일 (토) 10:00~10:30 */
export function formatSlotRange(slot: TimeSlot, endTime: string): string {
  return `${formatSlot(slot)}~${toHm(endTime)}`;
}

/** 한국 시간 기준 일시. 예: 10월 9일 (금) 10:00 */
export function formatInstant(value: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(value));
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? "";
  return `${formatDate(`${part("year")}-${part("month")}-${part("day")}`)} ${part("hour")}:${part("minute")}`;
}

/** 오늘(한국 시간) 날짜. 시간대 입력의 기본값으로 쓴다. */
export function todayInSeoul(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(now);
}

export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

/** `YYYY-MM` 달력. 1일 앞의 빈 요일 칸은 null이다(일요일 시작). */
export function monthGrid(yearMonth: string): (string | null)[] {
  const [year, month] = yearMonth.split("-").map(Number);
  const leading = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: days }, (_, index) => `${yearMonth}-${String(index + 1).padStart(2, "0")}`),
  ];
}

export function shiftMonth(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1 + delta, 1)).toISOString().slice(0, 7);
}

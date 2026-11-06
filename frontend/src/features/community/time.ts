const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const TIME_ZONE = "Asia/Seoul";

export function relativeTime(iso: string, now = Date.now()) {
  const elapsed = Math.max(0, now - new Date(iso).getTime());
  if (elapsed < MINUTE) return "방금";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}분`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}시간`;
  if (elapsed < 7 * DAY) return `${Math.floor(elapsed / DAY)}일`;
  return calendarDate(iso, now);
}

export function fullTime(iso: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium", timeStyle: "short", timeZone: TIME_ZONE }).format(new Date(iso));
}

function calendarDate(iso: string, now: number) {
  const date = new Date(iso);
  if (yearOf(date) === yearOf(new Date(now))) return format(date, { month: "long", day: "numeric" });
  return format(date, { year: "numeric", month: "long", day: "numeric" });
}

function yearOf(date: Date) {
  return format(date, { year: "numeric" });
}

function format(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("ko-KR", { ...options, timeZone: TIME_ZONE }).format(date);
}

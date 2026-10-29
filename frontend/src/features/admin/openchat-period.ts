export type OpenChatPeriod = "DAY" | "WEEK" | "MONTH" | "ALL";
export type OpenChatPostedRange = { readonly startDate: string; readonly endDate: string };

export function koreaToday(now = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Seoul" }).format(now);
}

function dateOf(value: string): Date {
  return new Date(`${value}T00:00:00Z`);
}

function isoDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** UTC 날짜 연산으로 브라우저의 시간대와 DST에 관계없이 한국 달력 날짜를 다룬다. */
export function openChatPostedRange(period: OpenChatPeriod, anchor: string): OpenChatPostedRange | null {
  if (period === "ALL") return null;
  const start = dateOf(anchor);
  if (period === "WEEK") start.setUTCDate(start.getUTCDate() - (start.getUTCDay() + 6) % 7);
  if (period === "MONTH") start.setUTCDate(1);
  const end = new Date(start);
  if (period === "WEEK") end.setUTCDate(end.getUTCDate() + 6);
  if (period === "MONTH") end.setUTCMonth(end.getUTCMonth() + 1, 0);
  return { startDate: isoDate(start), endDate: isoDate(end) };
}

export function moveOpenChatPeriod(period: OpenChatPeriod, anchor: string, direction: -1 | 1): string {
  const date = dateOf(openChatPostedRange(period, anchor)?.startDate ?? anchor);
  if (period === "MONTH") date.setUTCMonth(date.getUTCMonth() + direction);
  else date.setUTCDate(date.getUTCDate() + direction * (period === "WEEK" ? 7 : 1));
  return isoDate(date);
}

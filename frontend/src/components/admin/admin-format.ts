const DATE_TIME_FORMAT = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

export function formatDateTime(value: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "-" : DATE_TIME_FORMAT.format(parsed);
}

export function orDash(value: string | null): string {
  return value && value.trim() ? value : "-";
}

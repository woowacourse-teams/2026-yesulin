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

const TIME_FORMAT = new Intl.DateTimeFormat("ko-KR", {
  timeStyle: "medium",
  timeZone: "Asia/Seoul",
});

/** 자동 새로고침이 돌고 있는지 눈으로 확인할 수 있도록 초까지 보여 준다. */
export function formatTime(value: string | null): string {
  if (!value) return "-";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "-" : TIME_FORMAT.format(parsed);
}

export function orDash(value: string | null): string {
  return value && value.trim() ? value : "-";
}

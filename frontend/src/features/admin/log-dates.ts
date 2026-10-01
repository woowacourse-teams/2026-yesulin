/** 서버 로그 보관 기간(`LOG_MAX_HISTORY`)과 맞춘 날짜 선택 범위다. 오늘을 포함한다. */
export const LOG_RETENTION_DAYS = 14;

export type LogDateOption = {
  /** 오늘은 null로 두어 현재 로그 파일을 읽고 자동 새로고침을 허용한다. */
  readonly value: string | null;
  readonly label: string;
};

const KOREAN_DATE = new Intl.DateTimeFormat("en-CA", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Seoul",
});
const LABEL_FORMAT = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  weekday: "short",
  timeZone: "UTC",
});

/** 서버 로그 파일은 한국 날짜로 나뉜다. 브라우저 시간대와 관계없이 한국 날짜 목록을 만든다. */
export function recentLogDates(now: number, days = LOG_RETENTION_DAYS): readonly LogDateOption[] {
  const today = KOREAN_DATE.format(new Date(now));
  const base = Date.parse(`${today}T00:00:00Z`);
  return Array.from({ length: days }, (_, offset) => {
    const date = new Date(base - offset * 24 * 60 * 60 * 1000);
    const value = date.toISOString().slice(0, 10);
    const label = offset === 0 ? `오늘 · ${LABEL_FORMAT.format(date)}` : LABEL_FORMAT.format(date);
    return { value: offset === 0 ? null : value, label };
  });
}

/**
 * 명함 제작 마감처럼 운영자가 한국 시각으로 정하는 시각을 다룬다. 입력 칸(`datetime-local`)은 시간대가 없어서 한국 시각으로
 * 읽고 쓰며, 서버에는 `+09:00`을 붙인 ISO 시각으로 보낸다.
 */

const KOREA_OFFSET_MS = 9 * 60 * 60 * 1000;

/** 서버 ISO 시각을 `datetime-local` 입력 값(`YYYY-MM-DDTHH:mm`, 한국 시각)으로 바꾼다. */
export function toKoreaLocalInput(iso: string | null): string {
  if (!iso) return "";
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "";
  return new Date(time + KOREA_OFFSET_MS).toISOString().slice(0, 16);
}

/** `datetime-local` 입력 값을 한국 시각으로 보고 ISO 시각으로 바꾼다. 비었거나 형식이 다르면 null이다. */
export function fromKoreaLocalInput(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const time = Date.parse(`${value}:00+09:00`);
  return Number.isNaN(time) ? null : new Date(time).toISOString();
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

/** `11월 2일(월) 오전 9:00`처럼 한국 시각으로 짧게 쓴다. 브라우저 언어 설정과 상관없이 같은 모양이다. */
export function formatKoreaDeadline(iso: string): string {
  const korea = new Date(Date.parse(iso) + KOREA_OFFSET_MS);
  const hour = korea.getUTCHours();
  const period = hour < 12 ? "오전" : "오후";
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  const minute = String(korea.getUTCMinutes()).padStart(2, "0");
  return `${korea.getUTCMonth() + 1}월 ${korea.getUTCDate()}일(${WEEKDAYS[korea.getUTCDay()]}) ${period} ${hour12}:${minute}`;
}

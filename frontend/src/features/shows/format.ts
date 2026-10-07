import type { PublicShow, PublicShowSession } from "./types";

/** 잔여석이 이 값 이하이면 "잔여 n석"을 강조해 보여 준다. */
export const FEW_SEATS_THRESHOLD = 10;

const koreaDateTimeFormat = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  weekday: "short",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

type ShowDateTimeParts = {
  readonly year: string;
  readonly month: string;
  readonly day: string;
  readonly weekday: string;
  readonly time: string;
};

/** 서버는 회차 시각을 UTC ISO 문자열로 준다. 화면에 쓰기 전에 한국 시간으로 옮긴다. */
function showDateTimeParts(value: string): ShowDateTimeParts | null {
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return null;
  const parts = koreaDateTimeFormat.formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return {
    year: part("year"),
    month: part("month"),
    day: part("day"),
    weekday: part("weekday"),
    time: `${part("hour")}:${part("minute")}`,
  };
}

export function formatShowDate(value: string) {
  const parts = showDateTimeParts(value);
  return parts ? `${parts.month}월 ${parts.day}일 (${parts.weekday})` : "일정 확인 중";
}

export function formatShowTime(value: string) {
  return showDateTimeParts(value)?.time ?? "";
}

export function formatShowDateTime(value: string) {
  const parts = showDateTimeParts(value);
  return parts ? `${parts.month}월 ${parts.day}일 (${parts.weekday}) ${parts.time}` : "일정 확인 중";
}

export function formatShowFullDateTime(value: string) {
  const parts = showDateTimeParts(value);
  return parts ? `${parts.year}년 ${parts.month}월 ${parts.day}일 (${parts.weekday}) ${parts.time}` : "일정 확인 중";
}

/** 회차 목록의 첫 날과 마지막 날로 공연 기간을 만든다. 하루뿐이면 날짜 하나만 쓴다. */
export function formatShowPeriod(sessions: readonly Pick<PublicShowSession, "startsAt">[]) {
  if (!sessions.length) return "회차 준비 중";
  const sorted = [...sessions].sort((left, right) => left.startsAt.localeCompare(right.startsAt));
  const first = formatShowDate(sorted[0]!.startsAt);
  const last = formatShowDate(sorted.at(-1)!.startsAt);
  return first === last ? first : `${first} ~ ${last}`;
}

export type SessionAvailability = {
  readonly kind: "available" | "few" | "soldOut" | "closed";
  readonly label: string;
};

/** 잔여석을 숨긴 공연도 매수 상한이 0이면 매진이다. */
export function isSoldOut(session: Pick<PublicShowSession, "maxTicketCount">) {
  return session.maxTicketCount <= 0;
}

/**
 * 회차 카드와 요약에 쓰는 상태. 매진과 마감은 색이 아니라 문구로도 구분한다.
 * 공연이 잔여석을 숨기면(remainingSeats가 null) 숫자 대신 "예매 가능"만 보여 준다.
 */
export function sessionAvailability(
  session: Pick<PublicShowSession, "remainingSeats" | "maxTicketCount" | "bookable">,
): SessionAvailability {
  if (isSoldOut(session)) return { kind: "soldOut", label: "매진" };
  if (!session.bookable) return { kind: "closed", label: "예매 마감" };
  if (session.remainingSeats === null) return { kind: "available", label: "예매 가능" };
  if (session.remainingSeats <= FEW_SEATS_THRESHOLD) return { kind: "few", label: `잔여 ${session.remainingSeats}석` };
  return { kind: "available", label: `잔여 ${session.remainingSeats}석` };
}

export type ShowAvailability = {
  readonly kind: "open" | "soldOut" | "preparing" | "ended" | "closed";
  readonly label: string;
};

/** 상단 배지와 예매 버튼이 같은 상태를 말하도록 공연 단위 예매 상태를 한곳에서 정한다. */
export function showAvailability(show: Pick<PublicShow, "status" | "sessions">, now = Date.now()): ShowAvailability {
  if (show.status === "CLOSED") return { kind: "closed", label: "예매 종료" };
  if (show.sessions.some((session) => session.bookable)) return { kind: "open", label: "예매 중" };
  if (show.sessions.some((session) => isSoldOut(session) && Date.parse(session.startsAt) > now)) {
    return { kind: "soldOut", label: "매진" };
  }
  return show.sessions.length ? { kind: "ended", label: "예매 마감" } : { kind: "preparing", label: "회차 준비 중" };
}

/** 저장된 외부 예매 링크가 손상돼 있어도 http/https가 아닌 주소로 관객을 보내지 않는다. 쓸 수 없으면 null. */
export function externalReservationHref(show: Pick<PublicShow, "externalReservationUrl">): string | null {
  if (!show.externalReservationUrl) return null;
  try {
    const url = new URL(show.externalReservationUrl);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

const KST_OFFSET = "+09:00";

/** `datetime-local` 입력값(한국 시간 기준)을 서버가 받는 UTC ISO 문자열로 바꾼다. 형식이 틀리면 null. */
export function fromKstDateTimeInput(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const instant = new Date(`${value}:00${KST_OFFSET}`);
  return Number.isNaN(instant.getTime()) ? null : instant.toISOString();
}

/** 서버의 UTC ISO 문자열을 한국 시간 `datetime-local` 입력값으로 바꾼다. */
export function toKstDateTimeInput(value: string): string {
  const parts = showDateTimeParts(value);
  if (!parts) return "";
  const pad = (part: string) => part.padStart(2, "0");
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}T${parts.time}`;
}

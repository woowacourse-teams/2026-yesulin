/** 기획사가 예매자에게 문자를 보내거나 현장 명단으로 쓸 수 있게 예매자 번호·명단을 내보낸다. 취소된 예매는 넣지 않는다. */

import type { XlsxSheet } from "@/features/files/xlsx";
import { BOOKER_INFO_RETENTION_DAYS, type ProducerReservation } from "./types";

const koreaSheetDateTimeFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

type KstParts = { readonly date: string; readonly hour: string; readonly minute: string };

function kstParts(value: string): KstParts | null {
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return null;
  const parts = koreaSheetDateTimeFormat.formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return { date: `${part("year")}-${part("month")}-${part("day")}`, hour: part("hour"), minute: part("minute") };
}

/** 엑셀·파일명에 쓰는 한국 시간 `2026-09-28 13:30`. */
export function formatSheetDateTime(value: string) {
  const parts = kstParts(value);
  return parts ? `${parts.date} ${parts.hour}:${parts.minute}` : "";
}

/** 확정 예매자의 휴대폰 번호. 같은 번호는 처음 나온 순서대로 한 번만 넣는다. */
export function confirmedPhoneNumbers(reservations: readonly ProducerReservation[]): string[] {
  const phones = reservations
    .filter((reservation) => reservation.status === "CONFIRMED")
    .map((reservation) => reservation.bookerPhone.trim())
    .filter(Boolean);
  return [...new Set(phones)];
}

/** 문자 발송 사이트나 엑셀에 붙여넣기 쉽도록 한 줄에 번호 하나씩 둔다. */
export function phoneNumbersText(phones: readonly string[]) {
  return phones.join("\n");
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 관람 회차 날짜(한국 시간)에 보유 기간을 더한 날 `2026년 10월 5일 (월)`. 이날까지 명단을 지우도록 안내한다. */
export function bookerInfoDeleteBy(sessionStartsAt: string) {
  const parts = kstParts(sessionStartsAt);
  if (!parts) return "";
  const [year, month, day] = parts.date.split("-").map(Number);
  const deadline = new Date(Date.UTC(year!, month! - 1, day! + BOOKER_INFO_RETENTION_DAYS));
  return `${deadline.getUTCFullYear()}년 ${deadline.getUTCMonth() + 1}월 ${deadline.getUTCDate()}일 (${WEEKDAYS[deadline.getUTCDay()]})`;
}

/**
 * 명단 맨 아래 파기 안내. 내려받은 파일은 서버 파기와 상관없이 남으므로 기획사가 직접 지우도록 기한을 적는다.
 * 인쇄해도 잘리지 않게 한 줄이 명단 열 폭(A~E)을 넘지 않도록 나눈다.
 */
function deleteNotice(sessionStartsAt: string) {
  const deleteBy = bookerInfoDeleteBy(sessionStartsAt);
  return [
    "[개인정보 파기 안내]",
    `이 명단의 이름·휴대폰 번호는 관람 회차 종료 후 ${BOOKER_INFO_RETENTION_DAYS}일 이내에 파기해야 합니다.`,
    `${deleteBy ? `${deleteBy}까지 ` : ""}이 파일과 따로 복사해 둔 번호를 모두 삭제해 주세요.`,
  ];
}

export function reservationSheet(reservations: readonly ProducerReservation[], sessionStartsAt: string): XlsxSheet {
  return {
    name: "예매자명단",
    columns: [
      { header: "예매번호", width: 12 },
      { header: "이름", width: 14 },
      { header: "휴대폰 번호", width: 16 },
      { header: "매수", width: 8 },
      { header: "예매 시각", width: 18 },
    ],
    rows: reservations
      .filter((reservation) => reservation.status === "CONFIRMED")
      .map((reservation) => [
        reservation.code,
        reservation.bookerName,
        reservation.bookerPhone,
        reservation.ticketCount,
        formatSheetDateTime(reservation.createdAt),
      ]),
    notes: deleteNotice(sessionStartsAt),
  };
}

const MAX_TITLE_IN_FILE_NAME = 50;

/** `공연명_2026-10-03_19시_예매자명단.xlsx`. 분이 있으면 `19시30분`. 파일 이름에 쓸 수 없는 글자는 뺀다. */
export function reservationFileName(showTitle: string, sessionStartsAt: string) {
  const title = showTitle.replace(/[\\/:*?"<>|\u0000-\u001F]/g, " ").replace(/\s+/g, " ").trim()
    .slice(0, MAX_TITLE_IN_FILE_NAME).trim() || "공연";
  const parts = kstParts(sessionStartsAt);
  const session = parts
    ? `${parts.date}_${Number(parts.hour)}시${parts.minute === "00" ? "" : `${Number(parts.minute)}분`}`
    : "회차";
  return `${title}_${session}_예매자명단.xlsx`;
}

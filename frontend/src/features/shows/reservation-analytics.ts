import { AuditionRequestError } from "@/features/auditions/api-client";
import type { ReservationAnalyticsErrorCode } from "@/features/analytics/events";
import { RESERVATION_ERROR_CODES } from "./types";

const CODE_BY_SERVER_CODE: Readonly<Record<string, ReservationAnalyticsErrorCode>> = {
  [RESERVATION_ERROR_CODES.notEnoughSeats]: "not_enough_seats",
  [RESERVATION_ERROR_CODES.bookingClosed]: "booking_closed",
  [RESERVATION_ERROR_CODES.showNotOpen]: "show_not_open",
  [RESERVATION_ERROR_CODES.duplicate]: "duplicate",
  [RESERVATION_ERROR_CODES.sessionNotFound]: "session_changed",
  [RESERVATION_ERROR_CODES.showNotFound]: "session_changed",
  [RESERVATION_ERROR_CODES.invalidInput]: "invalid_input",
};

/** 예매 실패를 분석 이벤트에 보낼 허용된 코드로 바꾼다. 서버 메시지·연락처는 보내지 않는다. */
export function reservationAnalyticsErrorCode(cause: unknown): ReservationAnalyticsErrorCode {
  if (!(cause instanceof AuditionRequestError)) return "network_error";
  const mapped = cause.code ? CODE_BY_SERVER_CODE[cause.code] : undefined;
  if (mapped) return mapped;
  if (cause.status === 400) return "invalid_input";
  if (cause.status >= 500) return "server_error";
  return "unknown";
}

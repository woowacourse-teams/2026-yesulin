import { describe, expect, it } from "vitest";
import { AuditionRequestError } from "@/features/auditions/api-client";
import { reservationAnalyticsErrorCode } from "./reservation-analytics";

const requestError = (status: number, code: string | null) =>
  new AuditionRequestError("서버 메시지", status, "request-1", code);

describe("reservationAnalyticsErrorCode", () => {
  it("서버 오류 코드를 허용된 분석 코드로 바꾼다", () => {
    expect(reservationAnalyticsErrorCode(requestError(409, "SHOW_SESSION_NOT_ENOUGH_SEATS"))).toBe("not_enough_seats");
    expect(reservationAnalyticsErrorCode(requestError(409, "RESERVATION_DUPLICATE"))).toBe("duplicate");
    expect(reservationAnalyticsErrorCode(requestError(404, "SHOW_SESSION_NOT_FOUND"))).toBe("session_changed");
  });

  it("코드가 없으면 상태와 오류 종류로 구분한다", () => {
    expect(reservationAnalyticsErrorCode(requestError(400, "INVALID_REQUEST"))).toBe("invalid_input");
    expect(reservationAnalyticsErrorCode(requestError(503, null))).toBe("server_error");
    expect(reservationAnalyticsErrorCode(requestError(403, "CSRF"))).toBe("unknown");
    expect(reservationAnalyticsErrorCode(new TypeError("Failed to fetch"))).toBe("network_error");
  });
});

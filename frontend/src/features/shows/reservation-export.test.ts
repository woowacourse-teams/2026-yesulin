import { describe, expect, it } from "vitest";
import {
  confirmedPhoneNumbers,
  formatSheetDateTime,
  phoneNumbersText,
  reservationFileName,
  reservationSheet,
} from "./reservation-export";
import type { ProducerReservation } from "./types";

const reservation = (id: number, overrides: Partial<ProducerReservation> = {}): ProducerReservation => ({
  id,
  code: `CODE000${id}`,
  bookerName: `관객 ${id}`,
  bookerPhone: `010-0000-000${id}`,
  ticketCount: 2,
  status: "CONFIRMED",
  createdAt: "2026-09-28T04:30:00Z",
  canceledAt: null,
  ...overrides,
});

describe("reservation export", () => {
  it("확정 예매자 번호만 중복 없이 줄바꿈으로 모은다", () => {
    const phones = confirmedPhoneNumbers([
      reservation(1),
      reservation(2, { status: "CANCELED", canceledAt: "2026-09-28T05:00:00Z" }),
      reservation(3, { bookerPhone: "010-0000-0001" }),
      reservation(4),
    ]);

    expect(phones).toEqual(["010-0000-0001", "010-0000-0004"]);
    expect(phoneNumbersText(phones)).toBe("010-0000-0001\n010-0000-0004");
  });

  it("엑셀 명단은 확정 예매만 한 행씩, 예매 시각은 한국 시간으로 넣는다", () => {
    const sheet = reservationSheet([
      reservation(1, { ticketCount: 3 }),
      reservation(2, { status: "CANCELED" }),
    ]);

    expect(sheet.columns.map((column) => column.header)).toEqual(["예매번호", "이름", "휴대폰 번호", "매수", "예매 시각"]);
    expect(sheet.rows).toEqual([["CODE0001", "관객 1", "010-0000-0001", 3, "2026-09-28 13:30"]]);
  });

  it("한국 시간 기준으로 날짜가 바뀌는 시각도 맞게 표시한다", () => {
    expect(formatSheetDateTime("2026-09-30T15:10:00Z")).toBe("2026-10-01 00:10");
  });

  it("파일명에 공연명과 회차 날짜·시각을 넣고 쓸 수 없는 글자는 뺀다", () => {
    expect(reservationFileName("달빛 아래 소극장", "2026-10-03T10:00:00Z")).toBe("달빛 아래 소극장_2026-10-03_19시_예매자명단.xlsx");
    expect(reservationFileName("햄릿: 1/2부?", "2026-10-03T10:30:00Z")).toBe("햄릿 1 2부_2026-10-03_19시30분_예매자명단.xlsx");
    expect(reservationFileName("  ", "2026-10-03T00:05:00Z")).toBe("공연_2026-10-03_9시5분_예매자명단.xlsx");
  });
});

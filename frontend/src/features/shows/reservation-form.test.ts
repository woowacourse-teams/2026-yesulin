import { describe, expect, it } from "vitest";
import { validateReservationField } from "./reservation-form";

const valid = { bookerName: "홍길동", bookerPhone: "010-1234-5678", privacyAgreed: true };

describe("reservation form validation", () => {
  it("올바른 입력은 통과한다", () => {
    expect(validateReservationField("bookerName", valid)).toBeNull();
    expect(validateReservationField("bookerPhone", valid)).toBeNull();
    expect(validateReservationField("privacyAgreed", valid)).toBeNull();
  });

  it("빈 이름과 50자를 넘는 이름을 거절한다", () => {
    expect(validateReservationField("bookerName", { ...valid, bookerName: "  " })).toBe("예매자 이름을 입력해 주세요.");
    expect(validateReservationField("bookerName", { ...valid, bookerName: "가".repeat(51) })).not.toBeNull();
  });

  it("서버와 같은 하이픈 휴대폰 형식만 통과한다", () => {
    expect(validateReservationField("bookerPhone", { ...valid, bookerPhone: "010-123-5678" })).not.toBeNull();
    expect(validateReservationField("bookerPhone", { ...valid, bookerPhone: "" })).toBe("휴대폰 번호를 입력해 주세요.");
  });

  it("개인정보 동의 없이는 예매할 수 없다", () => {
    expect(validateReservationField("privacyAgreed", { ...valid, privacyAgreed: false })).not.toBeNull();
  });
});

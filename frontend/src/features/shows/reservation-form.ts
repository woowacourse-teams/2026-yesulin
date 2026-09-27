/** 예매 폼의 클라이언트 검증. 서버 `Booker`·`Reservation` 규칙과 같은 기준을 쓴다. */

export type ReservationValues = {
  readonly bookerName: string;
  readonly bookerPhone: string;
  readonly privacyAgreed: boolean;
};

export type ReservationField = keyof ReservationValues;

const MAX_NAME_LENGTH = 50;
const PHONE_PATTERN = /^\d{3}-\d{4}-\d{4}$/;

export function validateReservationField(field: ReservationField, values: ReservationValues): string | null {
  switch (field) {
    case "bookerName": {
      const name = values.bookerName.trim();
      if (!name) return "예매자 이름을 입력해 주세요.";
      return name.length > MAX_NAME_LENGTH ? "이름은 50자 이내로 입력해 주세요." : null;
    }
    case "bookerPhone":
      if (!values.bookerPhone.trim()) return "휴대폰 번호를 입력해 주세요.";
      return PHONE_PATTERN.test(values.bookerPhone.trim()) ? null : "휴대폰 번호 11자리를 010-1234-5678 형식으로 입력해 주세요.";
    case "privacyAgreed":
      return values.privacyAgreed ? null : "예매하려면 개인정보 수집·이용에 동의해 주세요.";
  }
}

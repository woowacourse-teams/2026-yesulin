import { describe, expect, it } from "vitest";
import { contactPhone } from "./contact-phone";

describe("PDF 기재 연락처", () => {
  it.each(["010-0000-0001", "01000000001", "010 0000 0001", "010.0000.0001", "+82 10 0000 0001", "+82 (0)10-0000-0001", "０１０－００００－０００１"])("명시된 번호 %s를 읽는다", value => {
    expect(contactPhone(`연락처: ${value}`)).toEqual({ status: "FOUND", phone: "010-0000-0001" });
  });
  it("같은 번호의 반복과 표기 차이는 한 번호로 취급한다", () => {
    expect(contactPhone("010-0000-0001 / +82 10 0000 0001")).toEqual({ status: "FOUND", phone: "010-0000-0001" });
  });
  it("여러 연락처 가운데 본인 번호를 임의로 선택하지 않는다", () => {
    expect(contactPhone("본인: 010-0000-0001\n소속사: 02-000-0002")).toEqual({ status: "MULTIPLE", phone: null });
  });
  it.each(["02-000-0001", "031-0000-0001", "070-0000-0001"])("유선 번호 %s도 표시한다", phone => {
    expect(contactPhone(`전화번호: ${phone}`)).toEqual({ status: "FOUND", phone });
  });
  it.each(["", "전화번호 없음", "010-000-0001", "9010000000019", "010-0000-00011", "https://example.test/01000000001", "01000000001@example.test", "010\n0000\n0001"])("없는 번호·잘못된 값·URL·여러 줄 숫자를 추정하지 않는다: %s", value => {
    expect(contactPhone(value)).toEqual({ status: "MISSING", phone: null });
  });
});

import { describe, expect, it } from "vitest";
import { formatPhoneInput, normalizePhone, parseContacts } from "./contacts";

describe("actor contacts", () => {
  it("여러 형태의 휴대폰 번호를 같은 형식으로 맞춘다", () => {
    expect(normalizePhone("01012345678")).toBe("010-1234-5678");
    expect(normalizePhone("010 123 4567")).toBe("010-123-4567");
    expect(normalizePhone("+82 10-1234-5678")).toBe("010-1234-5678");
    expect(normalizePhone("02-123-4567")).toBeNull();
  });

  it("입력하는 동안 휴대폰 번호에 하이픈을 넣는다", () => {
    expect(formatPhoneInput("010")).toBe("010");
    expect(formatPhoneInput("0101234")).toBe("010-1234");
    expect(formatPhoneInput("01012345")).toBe("010-1234-5");
    expect(formatPhoneInput("0101234567")).toBe("010-123-4567");
    expect(formatPhoneInput("01012345678")).toBe("010-1234-5678");
    expect(formatPhoneInput("010-1234-56789")).toBe("010-1234-5678");
  });

  it("한 줄에 한 명씩 이름과 번호를 순서와 구분자에 상관없이 읽는다", () => {
    const parsed = parseContacts([
      "김배우 010-1111-1111",
      "01022222222 이배우",
      "",
      "박 배우\t010 3333 3333\t햄릿",
      "최배우, 010-4444-4444",
    ].join("\n"));

    expect(parsed.errors).toEqual([]);
    expect(parsed.contacts).toEqual([
      { name: "김배우", phone: "010-1111-1111" },
      { name: "이배우", phone: "010-2222-2222" },
      { name: "박 배우", phone: "010-3333-3333" },
      { name: "최배우", phone: "010-4444-4444" },
    ]);
  });

  it("번호·이름이 없거나 번호가 겹치는 줄은 줄 번호와 함께 알려 준다", () => {
    const parsed = parseContacts("김배우\n010-1111-1111\n이배우 010-2222-2222\n정배우 01022222222");

    expect(parsed.contacts).toEqual([{ name: "이배우", phone: "010-2222-2222" }]);
    expect(parsed.errors.map((error) => [error.line, error.message])).toEqual([
      [1, "휴대폰 번호(010-1234-5678)를 찾지 못했어요."],
      [2, "이름이 없어요."],
      [4, "3번째 줄과 번호가 같아요."],
    ]);
  });
});

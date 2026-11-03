import { describe, expect, it } from "vitest";
import { isValidBirthDate, profileBirthDateError } from "./profile-input";

describe("프로필 생년월일 검증", () => {
  const now = new Date("2026-11-03T01:00:00Z");

  it.each(["", "2000-02-29", "1999-04-18", "2026-11-03"])("선택 항목의 빈값과 유효한 과거·오늘 날짜 %s는 허용한다", (value) => {
    expect(profileBirthDateError(value, now)).toBe("");
  });

  it.each(["1999023", "1999-02-31", "1900-02-29", "2026-13-01"])("미완성·존재하지 않는 날짜 %s를 거절한다", (value) => {
    expect(isValidBirthDate(value)).toBe(false);
    expect(profileBirthDateError(value, now)).toContain("올바른 날짜");
  });

  it("한국 시간 자정부터 오늘 날짜를 허용한다", () => {
    expect(profileBirthDateError("2026-11-04", new Date("2026-11-03T14:59:59Z"))).toContain("오늘 또는 이전");
    expect(profileBirthDateError("2026-11-04", new Date("2026-11-03T15:00:00Z"))).toBe("");
  });
});

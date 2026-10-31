import { describe, expect, it } from "vitest";
import { readRosterContact } from "./timetables";

describe("일정 연락처 확인", () => {
  const input = { entryId: "entry", name: " 가람 ", phone: "", email: "" };
  it("이름만으로 등록하고 입력한 연락처는 정규화한다", () => {
    expect(readRosterContact(input)).toEqual({ value: { ...input, name: "가람" }, error: "" });
    expect(readRosterContact({ ...input, phone: "+82 10-1234-5678", email: " actor@example.test " }).value)
      .toMatchObject({ phone: "010-1234-5678", email: "actor@example.test" });
  });
  it.each([{ name: " " }, { name: "가".repeat(31) }, { phone: "invalid01012345678" },
    { phone: "123" }, { email: "a@@example.test" }])("잘못된 입력을 빈 값으로 조용히 저장하지 않는다: %j", patch => {
    expect(readRosterContact({ ...input, ...patch }).error).not.toBe("");
  });
});

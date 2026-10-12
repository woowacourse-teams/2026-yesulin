import { describe, expect, it } from "vitest";
import { extractOtrId, parseTags } from "./audition-posts";

describe("extractOtrId", () => {
  it("번호만 넣거나 원문 주소를 붙여 넣어도 번호를 꺼낸다", () => {
    expect(extractOtrId(" 22397 ")).toBe("22397");
    expect(extractOtrId("https://otr.co.kr/audition/?vid=22397")).toBe("22397");
    expect(extractOtrId("https://otr.co.kr/audition/?mode=view&vid=22394#top")).toBe("22394");
  });

  it("번호가 없으면 null이다", () => {
    expect(extractOtrId("")).toBeNull();
    expect(extractOtrId("https://otr.co.kr/audition/")).toBeNull();
    expect(extractOtrId("22a97")).toBeNull();
  });
});

describe("parseTags", () => {
  it("쉼표로 나누고 앞의 #과 빈 값, 중복을 뺀다", () => {
    expect(parseTags(" 연극, #뮤지컬,, 연극 ,##단원 ")).toEqual(["연극", "뮤지컬", "단원"]);
    expect(parseTags("  ")).toEqual([]);
  });
});

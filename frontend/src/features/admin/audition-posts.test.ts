import { describe, expect, it } from "vitest";
import { extractOtrId } from "./audition-posts";

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

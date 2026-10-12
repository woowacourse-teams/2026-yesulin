import { describe, expect, it } from "vitest";
import { checkAuditionPostFile, extractOtrId, parseTags } from "./audition-posts";

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

describe("checkAuditionPostFile", () => {
  const megabytes = (size: number) => size * 1024 * 1024;

  it("사진은 이미지 형식이나 확장자로, 첨부는 확장자로만 판단한다", () => {
    expect(checkAuditionPostFile("IMAGE", { name: "poster.PNG", type: "", size: 10 })).toBeNull();
    expect(checkAuditionPostFile("IMAGE", { name: "poster", type: "image/webp", size: 10 })).toBeNull();
    expect(checkAuditionPostFile("IMAGE", { name: "poster.bmp", type: "image/bmp", size: 10 })).not.toBeNull();
    expect(checkAuditionPostFile("ATTACHMENT", { name: "지원서.HWP", type: "application/octet-stream", size: 10 })).toBeNull();
    expect(checkAuditionPostFile("ATTACHMENT", { name: "setup.exe", type: "", size: 10 })).not.toBeNull();
  });

  it("서버와 같은 크기 상한을 쓴다", () => {
    expect(checkAuditionPostFile("IMAGE", { name: "a.png", type: "image/png", size: megabytes(20) })).toBeNull();
    expect(checkAuditionPostFile("IMAGE", { name: "a.png", type: "image/png", size: megabytes(20) + 1 })).not.toBeNull();
    expect(checkAuditionPostFile("ATTACHMENT", { name: "a.pdf", type: "", size: megabytes(50) + 1 })).not.toBeNull();
    expect(checkAuditionPostFile("ATTACHMENT", { name: "a.pdf", type: "", size: 0 })).not.toBeNull();
  });
});

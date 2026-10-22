import { describe, expect, it } from "vitest";
import { checkAuditionPostFile, isAuditionPostImageFile, parseTags } from "./editing";

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

  it("사진의 본문·다운로드 용도마다 허용 형식과 크기를 구분한다", () => {
    const largePhoto = { name: "공고.JPG", type: "", size: megabytes(30) };
    expect(isAuditionPostImageFile(largePhoto)).toBe(true);
    expect(checkAuditionPostFile("IMAGE", largePhoto)).toContain("20MB");
    expect(checkAuditionPostFile("ATTACHMENT", largePhoto)).toBeNull();

    const webp = { name: "공고.webp", type: "", size: 100 };
    expect(isAuditionPostImageFile(webp)).toBe(true);
    expect(checkAuditionPostFile("IMAGE", webp)).toBeNull();
    expect(checkAuditionPostFile("ATTACHMENT", webp)).not.toBeNull();
    expect(isAuditionPostImageFile({ name: "지원서.hwp", type: "application/octet-stream" })).toBe(false);
  });
});

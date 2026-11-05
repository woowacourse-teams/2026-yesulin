import { describe, expect, it } from "vitest";
import { avatarHue } from "./avatar";

describe("익명 별 아바타 색", () => {
  it("같은 글의 같은 작성자는 항상 같은 색이다", () => {
    expect(avatarHue("12:익명3")).toBe(avatarHue("12:익명3"));
  });

  it("작성자와 글에 따라 여러 색으로 나뉜다", () => {
    const hues = new Set(Array.from({ length: 40 }, (_, index) => avatarHue(`${index}:익명${index % 5}`)));
    expect(hues.size).toBeGreaterThan(3);
  });
});

import { describe, expect, it } from "vitest";
import { objectParticle, topicParticle } from "./korean";

describe("korean particle", () => {
  it("받침이 있으면 을·은을 붙인다", () => {
    expect(objectParticle("프로필 사진")).toBe("프로필 사진을");
    expect(topicParticle("공연 경력")).toBe("공연 경력은");
  });

  it("받침이 없으면 를·는을 붙인다", () => {
    expect(objectParticle("주소")).toBe("주소를");
    expect(topicParticle("키")).toBe("키는");
  });

  it("한글로 끝나지 않으면 두 조사를 함께 남긴다", () => {
    expect(objectParticle("SNS 링크 URL")).toBe("SNS 링크 URL을(를)");
    expect(topicParticle("자기소개 1")).toBe("자기소개 1은(는)");
  });

  it("앞뒤 공백은 떼고 붙인다", () => {
    expect(objectParticle("  자기소개  ")).toBe("자기소개를");
  });
});

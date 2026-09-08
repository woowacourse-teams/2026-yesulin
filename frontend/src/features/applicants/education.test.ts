import { describe, expect, it } from "vitest";
import { educationText } from "./education";

describe("educationText", () => {
  it("renders university education with school and major", () => {
    expect(educationText({ level: "UNIVERSITY", school: "한국예술종합학교", major: "연기과" })).toBe("한국예술종합학교 · 연기과");
  });

  it("renders no education without a school value", () => {
    expect(educationText({ level: "NONE", school: "", major: "" })).toBe("학력 없음");
  });

  it("keeps legacy school-only snapshots readable", () => {
    expect(educationText({ level: null, school: "예술고등학교", major: "" })).toBe("예술고등학교");
  });
});

import { describe, expect, it } from "vitest";
import { EMPTY_PROFILE, readProfileForm } from "./profile-form";

describe("timetable profile form", () => {
  it("공백을 정리하고 담당자 번호 형식을 맞춘다", () => {
    expect(readProfileForm({
      title: " 2차 오디션 ",
      organizerName: " 남극장 ",
      organizerPhone: "01012345678",
      location: " 연습실 ",
      guide: "",
    }).profile).toEqual({
      title: "2차 오디션",
      organizerName: "남극장",
      organizerPhone: "010-1234-5678",
      location: "연습실",
      guide: "",
    });
  });

  it("필수 항목을 모두 알려 준다", () => {
    expect(Object.keys(readProfileForm(EMPTY_PROFILE).errors).sort()).toEqual(["organizerName", "organizerPhone", "title"]);
  });
});

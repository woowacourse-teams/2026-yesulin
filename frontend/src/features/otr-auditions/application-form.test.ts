import { describe, expect, it } from "vitest";
import { applicationFormSteps } from "@/features/applications/application-form";
import { applicationStepIssue } from "@/features/applications/application-form-state";
import { otrApplicationFields } from "./application-form";

describe("otrApplicationFields", () => {
  it("배역과 기본 정보는 필수, 추가 정보와 미디어는 선택으로 고정한다", () => {
    const fields = otrApplicationFields(["햄릿", "오필리어"]);

    expect(fields.find((field) => field.id === "SELECTED_ROLE")).toMatchObject({
      required: true,
      section: "BASIC",
      config: { options: ["햄릿", "오필리어"] },
    });
    expect(fields.filter((field) => field.section === "BASIC").every((field) => field.required)).toBe(true);
    expect(fields.filter((field) => field.section === "ADDITIONAL").every((field) => !field.required)).toBe(true);
    expect(fields.find((field) => field.id === "PHOTOS")).toMatchObject({ required: false, config: { maxCount: 3 } });
    expect(fields.find((field) => field.id === "VIDEO")?.config.videoRequirements).toHaveLength(3);
  });

  it("사진과 영상은 일부만 입력해도 유효하다", () => {
    const fields = otrApplicationFields(["햄릿"]);
    const media = applicationFormSteps(fields).find((step) => step.key === "media")!;

    expect(applicationStepIssue({
      step: media,
      photos: [{ id: "photo-1", name: "profile.jpg", url: "blob:test", status: "READY", slotIndex: 0 }],
      videoUrl: "",
      noCareer: false,
      careers: [],
      values: { "VIDEO.otr-video-1": "https://youtu.be/aaaaaaaaaaa" },
    })).toBeNull();
  });
});

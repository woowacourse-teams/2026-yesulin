import {
  APPLICATION_FIELD_OPTIONS,
  type ApplicationFieldInput,
} from "@/features/auditions/creation-types";

const CUSTOM_QUESTIONS = [
  "이 작품에 지원한 동기를 적어 주세요.",
  "배역을 어떻게 해석했는지 적어 주세요.",
  "오디션에서 보여주고 싶은 강점을 적어 주세요.",
] as const;

/** 모든 표준 항목과 커스텀 질문 표시를 한 번에 확인하는 공개 지원서 fixture. */
export function allFieldsApplicationFixture(): readonly ApplicationFieldInput[] {
  const standardFields = APPLICATION_FIELD_OPTIONS.map((field): ApplicationFieldInput => ({
    id: field.key,
    key: field.key,
    label: field.label,
    enabled: true,
    required: field.section === "BASIC" || field.section === "MATERIALS",
    custom: false,
    section: field.section,
    inputType: field.inputType,
    order: field.order,
    layout: field.layout,
    config: field.key === "VIDEO"
      ? {
          ...field.config,
          maxCount: 10,
          videoRequirements: [{ id: "acting-video-1", description: "자유 연기 영상" }],
        }
      : field.config,
  }));

  const customFields = CUSTOM_QUESTIONS.map((label, index): ApplicationFieldInput => ({
    id: `custom-question-${index + 1}`,
    label,
    enabled: true,
    required: true,
    custom: true,
    section: "CUSTOM",
    inputType: "TEXTAREA",
    order: (index + 1) * 10,
    layout: "FULL",
    config: { maxLength: 2000 },
  }));

  return [...standardFields, ...customFields];
}

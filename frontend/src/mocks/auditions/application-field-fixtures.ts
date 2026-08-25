import { APPLICATION_FIELD_OPTIONS, type ApplicationFieldInput, type ApplicationFieldKey } from "@/features/auditions/creation-types";
import { applicationFieldFixture } from "./fixture-builders";

const CUSTOM_QUESTIONS = [
  "이 작품에 지원한 동기를 적어 주세요.",
  "배역을 어떻게 해석했는지 적어 주세요.",
  "오디션에서 보여주고 싶은 강점을 적어 주세요.",
] as const;

/** 모든 표준 항목과 커스텀 질문 표시를 한 번에 확인하는 공개 지원서 fixture. */
export function allFieldsApplicationFixture(): readonly ApplicationFieldInput[] {
  return applicationFieldFixture({
    enabledKeys: APPLICATION_FIELD_OPTIONS.map((field) => field.key),
    videoRequirements: [{ id: "acting-video-1", description: "자유 연기 영상" }],
    customQuestions: CUSTOM_QUESTIONS.map((label, index) => ({ id: `custom-question-${index + 1}`, label })),
  });
}

/** 공고→작성→제출 결과→심사 전체 흐름을 확인하는 기본 시드 양식. */
export function screeningFlowApplicationFixture(): readonly ApplicationFieldInput[] {
  return applicationFieldFixture({
    enabledKeys: APPLICATION_FIELD_OPTIONS.map((field) => field.key),
    photoRequirements: [
      { id: "profile-photo", description: "프로필 사진", count: 1 },
      { id: "full-body-photo", description: "전신 사진", count: 1 },
      { id: "acting-photo", description: "연기 이미지", count: 2 },
    ],
    videoRequirements: [
      { id: "acting-video", description: "자유 연기 영상" },
      { id: "script-video", description: "지정 대사 영상" },
      { id: "emotion-video", description: "감정 연기 영상" },
    ],
    customQuestions: [{ id: "MOTIVATION", label: "이 작품에 지원한 동기를 적어 주세요." }],
  });
}

const BASIC_CONTACT_KEYS = ["NAME", "PHONE", "EMAIL"] as const satisfies readonly ApplicationFieldKey[];

/** 빈 섹션 생략과 가장 짧은 지원 흐름을 확인한다. */
export function minimalApplicationFixture() {
  return applicationFieldFixture({ enabledKeys: BASIC_CONTACT_KEYS });
}

/** 키를 받지 않고 몸무게만 받는 독립 기본정보 계약을 확인한다. */
export function withoutHeightApplicationFixture() {
  return applicationFieldFixture({
    enabledKeys: ["NAME", "WEIGHT", "BIRTH", "GENDER", "PHONE", "EMAIL", "ADDRESS", "PHOTOS"],
    photoRequirements: [{ id: "profile-photo", description: "프로필 사진", count: 1 }],
  });
}

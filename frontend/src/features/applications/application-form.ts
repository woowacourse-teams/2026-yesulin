import type {
  ApplicationFieldInput,
  ApplicationFieldSection,
} from "@/features/auditions/creation-types";

export type ApplicationFormStep = {
  readonly section: Extract<ApplicationFieldSection, "BASIC" | "CUSTOM" | "MATERIALS" | "CAREER">;
  readonly title: string;
  readonly description: string;
  readonly fields: readonly ApplicationFieldInput[];
};

const STEP_DETAILS = {
  BASIC: { title: "기본 정보", description: "공연사가 지원자 정보를 확인하는 데 사용합니다." },
  MATERIALS: { title: "사진과 영상", description: "지원자의 모습을 확인할 수 있는 자료를 등록해 주세요." },
  CAREER: { title: "경력", description: "최근 작품부터 적어 주세요. 경력이 없어도 지원할 수 있어요." },
  CUSTOM: { title: "추가 질문", description: "공연사가 공고별로 요청한 내용을 작성해 주세요." },
} as const;

/** 구현된 섹션의 활성 필드만 순서대로 묶는다. 비어 있는 단계는 만들지 않는다. */
export function applicationFormSteps(fields: readonly ApplicationFieldInput[]): readonly ApplicationFormStep[] {
  return (Object.keys(STEP_DETAILS) as Array<ApplicationFormStep["section"]>).flatMap((section) => {
    const enabled = fields
      .filter((field) => field.enabled && field.section === section)
      .toSorted((left, right) => left.order - right.order);
    return enabled.length === 0 ? [] : [{ section, ...STEP_DETAILS[section], fields: enabled }];
  });
}

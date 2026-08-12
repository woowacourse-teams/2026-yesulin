import type {
  ApplicationFieldInput,
  ApplicationFieldSection,
} from "@/features/auditions/creation-types";

export type ApplicationFormStep = {
  readonly section: ApplicationFieldSection;
  readonly title: string;
  readonly description: string;
  readonly fields: readonly ApplicationFieldInput[];
};

const STEP_DETAILS = {
  BASIC: { title: "기본 정보", description: "공연사가 지원자 정보를 확인하는 데 사용합니다." },
  INTRODUCTION: { title: "자기소개", description: "공연사가 요청한 자기소개와 지원 동기를 작성해 주세요." },
  MATERIALS: { title: "사진과 영상", description: "지원자의 모습을 확인할 수 있는 자료를 등록해 주세요." },
  CAREER: { title: "경력", description: "최근 작품부터 적어 주세요. 경력이 없어도 지원할 수 있어요." },
  CUSTOM: { title: "추가 질문", description: "공연사가 공고별로 요청한 내용을 작성해 주세요." },
} as const;

export type ApplicationDocument = {
  readonly id: string;
  readonly title: string;
  readonly detail: string;
  readonly required: boolean;
};

export type ApplicationStepProgress = {
  readonly status: "CURRENT" | "COMPLETED" | "UPCOMING";
  readonly hasError: boolean;
  readonly accessible: boolean;
};

/** 구현된 섹션의 활성 필드만 순서대로 묶는다. 비어 있는 단계는 만들지 않는다. */
export function applicationFormSteps(fields: readonly ApplicationFieldInput[]): readonly ApplicationFormStep[] {
  return (Object.keys(STEP_DETAILS) as Array<ApplicationFormStep["section"]>).flatMap((section) => {
    const enabled = fields
      .filter((field) => field.enabled && field.section === section)
      .toSorted((left, right) => left.order - right.order);
    return enabled.length === 0 ? [] : [{ section, ...STEP_DETAILS[section], fields: enabled }];
  });
}

/** 공고 상세와 지원서가 같은 활성 필드·순서를 보여 주도록 하는 제출 자료 읽기 모델. */
export function applicationDocuments(fields: readonly ApplicationFieldInput[]): readonly ApplicationDocument[] {
  return applicationFormSteps(fields).flatMap((step) => step.fields.map((field) => ({
    id: field.id,
    title: field.label,
    detail: applicationFieldDetail(field),
    required: field.required,
  })));
}

/** 단계 이동을 위해 Provider가 보관하는 진행 상태의 읽기 모델. */
export function applicationStepProgress({
  steps,
  stepIndex,
  maxReachedStepIndex,
  completedStepIndexes,
  stepErrors,
}: {
  steps: readonly ApplicationFormStep[];
  stepIndex: number;
  maxReachedStepIndex: number;
  completedStepIndexes: readonly number[];
  stepErrors: Readonly<Record<number, string>>;
}): readonly ApplicationStepProgress[] {
  return steps.map((_, index) => ({
    status: index === stepIndex ? "CURRENT" : completedStepIndexes.includes(index) ? "COMPLETED" : "UPCOMING",
    hasError: Boolean(stepErrors[index]),
    accessible: index <= maxReachedStepIndex,
  }));
}

export function applicationFieldDetail(field: ApplicationFieldInput) {
  if (field.inputType === "FILE") return "JPG, PNG, WEBP · 파일당 10MB 이하 · 전체 최대 10장";
  if (field.inputType === "URL") return "YouTube 링크로 입력해 주세요. 영상 파일은 받지 않아요.";
  if (field.inputType === "COMPOSITE") return field.config.fields?.map((part) => part.label).join(" · ") ?? "세부 정보를 입력해 주세요.";
  if (field.inputType === "SELECT") return field.config.options?.join(" · ") ?? "선택해 주세요.";

  const length = [
    field.config.minLength ? `최소 ${field.config.minLength}자` : "",
    field.config.maxLength ? `최대 ${field.config.maxLength}자` : "",
  ].filter(Boolean).join(" · ");
  return length || field.config.placeholder || "내용을 입력해 주세요.";
}

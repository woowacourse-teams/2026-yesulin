import type {
  ApplicationFieldInput,
  ApplicationFieldSection,
} from "@/features/auditions/creation-types";

export type ApplicationFormStep = {
  readonly key: ApplicationStepKey;
  readonly sections: readonly ApplicationFieldSection[];
  readonly title: string;
  readonly description: string;
  readonly fields: readonly ApplicationFieldInput[];
};

export const APPLICATION_STEP_KEYS = ["basic", "additional", "media", "questions"] as const;
export type ApplicationStepKey = (typeof APPLICATION_STEP_KEYS)[number];
export type ApplicationWriteRouteKey = ApplicationStepKey | "review";

const STEP_DETAILS: readonly Omit<ApplicationFormStep, "fields">[] = [
  { key: "basic", sections: ["BASIC"], title: "기본 정보", description: "기획사/제작사가 배우 정보를 확인하는 데 사용합니다." },
  { key: "additional", sections: ["ADDITIONAL", "INTRODUCTION", "CAREER"], title: "추가 정보", description: "공고에서 요청한 선택 정보를 작성해 주세요." },
  { key: "media", sections: ["MATERIALS"], title: "사진과 영상", description: "배우의 모습을 확인할 수 있는 자료를 등록해 주세요." },
  { key: "questions", sections: ["CUSTOM"], title: "추가 질문", description: "기획사/제작사가 공고별로 요청한 내용을 작성해 주세요." },
];

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

/**
 * 지원서 작성 URL과 같은 단계로 활성 필드를 묶는다.
 * 공고가 아무 항목도 요청하지 않은 단계는 통과할 내용이 없으므로 노출하지 않는다.
 */
export function applicationFormSteps(fields: readonly ApplicationFieldInput[]): readonly ApplicationFormStep[] {
  return STEP_DETAILS.map((step) => ({
    ...step,
    fields: fields
      .filter((field) => field.enabled && step.sections.includes(field.section))
      .toSorted((left, right) => left.order - right.order),
  })).filter((step) => step.fields.length > 0);
}

/** URL의 단계 키를 실제로 노출 중인 단계 위치로 옮긴다. 빠진 단계로 들어오면 첫 단계로 보낸다. */
export function applicationStepIndexIn(steps: readonly ApplicationFormStep[], route: ApplicationWriteRouteKey) {
  if (route === "review") return Math.max(0, steps.length - 1);
  return Math.max(0, steps.findIndex((step) => step.key === route));
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
  stepErrors: Readonly<Record<number, Readonly<Record<string, string>>>>;
}): readonly ApplicationStepProgress[] {
  return steps.map((_, index) => ({
    status: index === stepIndex ? "CURRENT" : completedStepIndexes.includes(index) ? "COMPLETED" : "UPCOMING",
    hasError: Object.keys(stepErrors[index] ?? {}).length > 0,
    accessible: index <= maxReachedStepIndex,
  }));
}

export function applicationFieldDetail(field: ApplicationFieldInput) {
  if (field.inputType === "FILE") {
    const requirements = field.config.photoRequirements ?? [];
    return requirements.length ? requirements.map((item) => `${item.description} ${item.count}장`).join(" · ") : `JPG, PNG, WEBP · 파일당 20MB 이하 · 최대 ${Math.min(10, Math.max(1, field.config.maxCount ?? 10))}장`;
  }
  if (field.inputType === "URL" && field.section === "MATERIALS") {
    const requirements = field.config.videoRequirements ?? [];
    return requirements.length > 0
      ? requirements.map((item) => item.description).join(" · ")
      : "YouTube 링크로 입력해 주세요. 영상 파일은 받지 않아요.";
  }
  if (field.inputType === "COMPOSITE") return field.config.fields?.map((part) => part.label).join(" · ") ?? "세부 정보를 입력해 주세요.";
  if (field.inputType === "REGION") return "시·도와 시·군·구까지만 선택합니다. 상세 주소는 받지 않아요.";
  if (field.inputType === "SELECT") return field.config.options?.join(" · ") ?? "선택해 주세요.";

  const length = [
    field.config.minLength ? `최소 ${field.config.minLength}자` : "",
    field.config.maxLength ? `최대 ${field.config.maxLength}자` : "",
  ].filter(Boolean).join(" · ");
  return length || field.config.placeholder || "내용을 입력해 주세요.";
}

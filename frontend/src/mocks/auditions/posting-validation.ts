import type { ApplicationFieldInput, AuditionRoundInput, PerformanceRoleTemplate, PostingRoleInput } from "@/features/auditions/creation-types";

export type PostingDraft = {
  readonly title: string;
  readonly isOpenCall: boolean;
  readonly recruitmentStart: string;
  readonly recruitmentEnd: string;
  readonly roles: readonly PostingRoleInput[];
  readonly rounds: readonly AuditionRoundInput[];
  readonly applicationFields: readonly ApplicationFieldInput[];
};

export type PostingValidationError = { readonly code: string; readonly message: string };
const hasText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

/** 공고 생성과 부분 수정 뒤의 완성 상태에 동일하게 적용하는 도메인 검증. */
export function validatePostingDraft(draft: PostingDraft, templates: readonly PerformanceRoleTemplate[]): PostingValidationError | null {
  if (!hasText(draft.title)) return { code: "TITLE_REQUIRED", message: "공고 제목을 입력해 주세요." };
  if (!hasText(draft.recruitmentStart) || !hasText(draft.recruitmentEnd)) return { code: "PERIOD_REQUIRED", message: "모집 기간을 입력해 주세요." };
  if (draft.recruitmentStart > draft.recruitmentEnd) return { code: "INVALID_PERIOD", message: "모집 종료일은 시작일보다 빠를 수 없습니다." };
  if (!Array.isArray(draft.roles) || draft.roles.length === 0) return { code: "ROLE_REQUIRED", message: "모집할 배역을 하나 이상 선택해 주세요." };
  if (draft.isOpenCall && draft.roles.length !== 1) return { code: "OPEN_CALL_ROLE_REQUIRED", message: "배역 구분 없는 공고는 모집 분야를 하나만 선택해 주세요." };
  if (draft.roles.some((role) => !Number.isInteger(role.quota) || role.quota < 1)) return { code: "INVALID_QUOTA", message: "배역별 모집 인원은 1명 이상이어야 합니다." };
  const templateIds = new Set(templates.map((template) => template.id));
  if (draft.roles.some((role) => !templateIds.has(role.templateId))) return { code: "UNKNOWN_ROLE_TEMPLATE", message: "공연에 등록되지 않은 배역이 포함되어 있습니다." };
  if (!Array.isArray(draft.rounds) || draft.rounds.length < 2 || draft.rounds.length > 3) return { code: "INVALID_ROUND_COUNT", message: "전형은 2개 이상 3개 이하로 설정해 주세요." };
  if (draft.rounds.some((round, index) => round.round !== index + 1 || !hasText(round.name))) return { code: "INVALID_ROUND_ORDER", message: "전형 이름과 차수 순서를 확인해 주세요." };
  const dates = draft.rounds.map((round) => round.date);
  if (dates.some((date) => !hasText(date)) || dates[0]! < draft.recruitmentEnd || dates.some((date, index) => index > 0 && date < dates[index - 1]!)) return { code: "INVALID_ROUND_DATE", message: "전형 일정은 모집 종료 이후 차수 순서대로 입력해 주세요." };
  if (!Array.isArray(draft.applicationFields) || draft.applicationFields.filter((field) => field.enabled).some((field) => !hasText(field.label))) return { code: "INVALID_FIELD_LABEL", message: "지원서 항목 이름을 확인해 주세요." };
  return null;
}

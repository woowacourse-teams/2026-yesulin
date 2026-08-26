import { MAX_REQUESTED_PHOTO_COUNT, MAX_VIDEO_REQUIREMENTS, type ApplicationFieldInput, type AuditionRoundInput, type PerformanceRoleTemplate, type PhotoRequirement, type PostingRoleInput, type VideoRequirement } from "@/features/auditions/creation-types";
import { validateAuditionDates } from "@/features/auditions/audition-date-policy";

export type PostingDraft = {
  readonly title: string;
  readonly posterUrl?: string;
  readonly performanceStart?: string;
  readonly performanceEnd?: string;
  readonly isOpenCall: boolean;
  readonly allowsMultipleRoles?: boolean;
  readonly recruitmentStart: string;
  readonly recruitmentEnd: string;
  readonly roles: readonly PostingRoleInput[];
  readonly rounds: readonly AuditionRoundInput[];
  readonly applicationFields: readonly ApplicationFieldInput[];
  readonly applicationGuide?: string;
};

export type PostingValidationError = { readonly code: string; readonly message: string };
const hasText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

/** 공고 생성과 부분 수정 뒤의 완성 상태에 동일하게 적용하는 도메인 검증. */
export function validatePostingDraft(draft: PostingDraft, templates: readonly PerformanceRoleTemplate[]): PostingValidationError | null {
  if (!hasText(draft.title)) return { code: "TITLE_REQUIRED", message: "공고 제목을 입력해 주세요." };
  if (draft.title.length > 255) return { code: "TITLE_TOO_LONG", message: "공고 제목은 255자 이하로 입력해 주세요." };
  if (!hasText(draft.posterUrl)) return { code: "POSTER_REQUIRED", message: "공고 포스터를 등록해 주세요." };
  const dateIssue = validateAuditionDates({
    performanceStart: draft.performanceStart ?? "",
    performanceEnd: draft.performanceEnd ?? "",
    recruitmentStart: draft.recruitmentStart,
    recruitmentEnd: draft.recruitmentEnd,
    rounds: draft.rounds,
  })[0];
  if (dateIssue) return { code: dateIssue.code, message: dateIssue.message };
  if (!Array.isArray(draft.roles) || draft.roles.length === 0) return { code: "ROLE_REQUIRED", message: "모집할 배역을 하나 이상 선택해 주세요." };
  if (draft.roles.some((role) => !Number.isInteger(role.quota) || role.quota < 1)) return { code: "INVALID_QUOTA", message: "배역별 모집 인원은 1명 이상이어야 합니다." };
  if (draft.roles.some((role) => role.ageMin < 0 || role.ageMax < role.ageMin)) return { code: "INVALID_ROLE_CONDITION", message: "배역별 성별·나이 조건을 확인해 주세요." };
  const templateIds = new Set(templates.map((template) => template.id));
  if (draft.roles.some((role) => !templateIds.has(role.templateId))) return { code: "UNKNOWN_ROLE_TEMPLATE", message: "공연에 등록되지 않은 배역이 포함되어 있습니다." };
  if (!Array.isArray(draft.rounds) || draft.rounds.length < 1 || draft.rounds.length > 5) return { code: "INVALID_ROUND_COUNT", message: "전형은 1개 이상 5개 이하로 설정해 주세요." };
  if (draft.rounds.some((round, index) => round.round !== index + 1 || !hasText(round.name))) return { code: "INVALID_ROUND_ORDER", message: "전형 이름과 차수 순서를 확인해 주세요." };
  if (!Array.isArray(draft.applicationFields) || draft.applicationFields.filter((field) => field.enabled).some((field) => !hasText(field.label))) return { code: "INVALID_FIELD_LABEL", message: "지원서 항목 이름을 확인해 주세요." };
  if (draft.applicationFields.some((field) => field.label.length > 255)) return { code: "FIELD_LABEL_TOO_LONG", message: "지원서의 한 줄 문구는 255자 이하로 입력해 주세요." };
  if ((draft.applicationGuide?.length ?? 0) > 2000) return { code: "APPLICATION_GUIDE_TOO_LONG", message: "지원 안내는 2,000자 이하로 입력해 주세요." };
  const photoField = draft.applicationFields.find((field) => field.id === "PHOTOS" && field.enabled);
  const photoRequirements: readonly PhotoRequirement[] = photoField?.config.photoRequirements ?? [];
  const photoTotal = photoRequirements.reduce((sum, item) => sum + item.count, 0);
  if (photoField && (photoRequirements.length < 1 || photoTotal > MAX_REQUESTED_PHOTO_COUNT || photoRequirements.some((item) => !hasText(item.description) || item.description.length > 255 || !Number.isInteger(item.count) || item.count < 1))) return { code: "INVALID_PHOTO_REQUIREMENTS", message: `프로필 사진 설명은 255자 이하로 적고 전체 ${MAX_REQUESTED_PHOTO_COUNT}장 이하로 입력해 주세요.` };
  const videoField = draft.applicationFields.find((field) => field.id === "VIDEO" && field.enabled);
  const videoRequirements: readonly VideoRequirement[] = videoField?.config.videoRequirements ?? [];
  if (videoField && (videoRequirements.length < 1 || videoRequirements.length > MAX_VIDEO_REQUIREMENTS || videoRequirements.some((item) => !hasText(item.description) || item.description.length > 255))) return { code: "INVALID_VIDEO_REQUIREMENTS", message: `영상 설명은 255자 이하로 적고 요구사항을 1개 이상 ${MAX_VIDEO_REQUIREMENTS}개 이하로 입력해 주세요.` };
  if (draft.applicationFields.some((field) => field.custom && field.config.maxLength !== 2000)) return { code: "INVALID_CUSTOM_LENGTH", message: "추가 질문의 답변 길이는 최대 2,000자로 설정해 주세요." };
  return null;
}

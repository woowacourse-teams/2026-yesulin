import { MAX_VIDEO_REQUIREMENTS, type ApplicationFieldInput } from "@/features/auditions/creation-types";
import type { ApplicantAnswerValue } from "@/features/applicants/types";

type AnswerInput = { readonly key: string; readonly value: ApplicantAnswerValue };
export type ApplicationValidationError = { readonly code: string; readonly message: string };

const textTypes = new Set(["TEXT", "TEL", "DATE", "SELECT", "TEXTAREA", "URL"]);
const hasText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

function validCareer(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === "object" && item !== null
    && "year" in item && Number.isInteger(item.year)
    && "title" in item && hasText(item.title)
    && "part" in item && hasText(item.part));
}

function validComposite(field: ApplicationFieldInput, value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  return (field.config.fields ?? []).every((part) => {
    const candidate = (value as Record<string, unknown>)[part.key];
    return part.inputType === "NUMBER"
      ? typeof candidate === "number" && Number.isFinite(candidate) && candidate > 0
      : hasText(candidate);
  });
}

function validType(field: ApplicationFieldInput, value: unknown) {
  if (field.id === "CAREER") return validCareer(value);
  if (field.section === "MATERIALS" && field.inputType === "URL" && (field.config.videoRequirements?.length ?? 0) > 0) return Array.isArray(value) && value.every(hasText);
  if (textTypes.has(field.inputType)) return typeof value === "string";
  if (field.inputType === "NUMBER") return typeof value === "number" && Number.isFinite(value);
  if (field.inputType === "FILE") return Array.isArray(value) && value.every(hasText);
  if (field.inputType === "COMPOSITE") return validComposite(field, value);
  return false;
}

function hasRequiredValue(field: ApplicationFieldInput, value: unknown) {
  if (field.id === "CAREER") return Array.isArray(value);
  if (field.section === "MATERIALS" && field.inputType === "URL" && (field.config.videoRequirements?.length ?? 0) > 0) return Array.isArray(value) && value.length === field.config.videoRequirements?.length && value.every(hasText);
  if (field.inputType === "FILE") return Array.isArray(value) && value.length > 0;
  if (field.inputType === "COMPOSITE") return validComposite(field, value);
  if (typeof value === "string") return value.trim().length > 0;
  return typeof value === "number" ? Number.isFinite(value) : value !== undefined && value !== null;
}

export function validateApplicationAnswers(fields: readonly ApplicationFieldInput[], answers: readonly AnswerInput[]): ApplicationValidationError | null {
  const enabled = fields.filter((field) => field.enabled);
  const fieldByKey = new Map(enabled.map((field) => [field.id, field]));
  const answerByKey = new Map(answers.map((answer) => [answer.key, answer]));
  if (answerByKey.size !== answers.length) return { code: "DUPLICATE_FIELD_KEY", message: "같은 지원서 항목이 중복되어 있습니다." };
  if (answers.some((answer) => !fieldByKey.has(answer.key))) return { code: "UNKNOWN_FIELD_KEY", message: "공고에 없는 지원서 항목이 포함되어 있습니다." };

  const missing = enabled.find((field) => field.required && !hasRequiredValue(field, answerByKey.get(field.id)?.value));
  if (missing) return { code: "REQUIRED_ANSWER_MISSING", message: "필수 항목을 모두 입력해 주세요." };

  for (const answer of answers) {
    const field = fieldByKey.get(answer.key)!;
    if (!validType(field, answer.value)) return { code: "INVALID_ANSWER_TYPE", message: `${field.label} 항목의 입력 형식을 확인해 주세요.` };
    if (field.inputType === "FILE" && Array.isArray(answer.value)) {
      const requested = field.config.photoRequirements?.reduce((sum, item) => sum + item.count, 0) ?? field.config.maxCount;
      if (requested && answer.value.length !== requested) return { code: "INVALID_PHOTO_COUNT", message: `${field.label}은(는) 요구사항에 맞게 ${requested}장 제출해 주세요.` };
    }
    if (field.section === "MATERIALS" && field.inputType === "URL" && Array.isArray(answer.value)) {
      const requested = field.config.videoRequirements?.length ?? 0;
      if (answer.value.length !== requested || requested > MAX_VIDEO_REQUIREMENTS) return { code: "INVALID_VIDEO_COUNT", message: `${field.label}는 요구사항에 맞게 ${requested}개 제출해 주세요.` };
    }
    if (typeof answer.value === "string" && answer.value.trim()) {
      if (field.inputType === "DATE" && !/^\d{4}-\d{2}-\d{2}$/.test(answer.value)) return { code: "INVALID_ANSWER_TYPE", message: `${field.label}의 날짜 형식을 확인해 주세요.` };
      if (field.inputType === "SELECT" && field.config.options?.length && !field.config.options.includes(answer.value)) return { code: "INVALID_ANSWER_TYPE", message: `${field.label}의 선택값을 확인해 주세요.` };
      if (field.config.minLength && answer.value.trim().length < field.config.minLength) return { code: "ANSWER_TOO_SHORT", message: `${field.label}은(는) ${field.config.minLength}자 이상 입력해 주세요.` };
      if (field.config.maxLength && answer.value.length > field.config.maxLength) return { code: "ANSWER_TOO_LONG", message: `${field.label}은(는) ${field.config.maxLength}자 이하로 입력해 주세요.` };
    }
  }
  return null;
}

export function mergeApplicationAnswers(current: readonly AnswerInput[], changes: readonly AnswerInput[]): readonly AnswerInput[] {
  const changed = new Map(changes.map((answer) => [answer.key, answer.value]));
  const currentKeys = new Set(current.map((answer) => answer.key));
  return [
    ...current.map((answer) => changed.has(answer.key) ? { ...answer, value: changed.get(answer.key)! } : answer),
    ...changes.filter((answer) => !currentKeys.has(answer.key)),
  ];
}

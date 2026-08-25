import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import type { ApplicantProfileResponse, ProfilePrefillResponse } from "./types";

const PREFILLABLE_KEYS = new Set([
  "NAME", "HEIGHT", "WEIGHT", "BIRTH", "GENDER", "PHONE", "EMAIL", "ADDRESS",
  "SCHOOL", "LINK", "NATIONALITY", "COVER_LETTER", "SPECIALTY", "HOBBIES", "MILITARY", "CAREER",
]);

/** 실제 프로필에서 공고가 수집하는 기본·추가 정보만 지원서 입력 계약으로 변환한다. */
export function profilePrefillForFields(
  profile: ApplicantProfileResponse,
  fields: readonly ApplicationFieldInput[],
): ProfilePrefillResponse {
  const profileAnswers = new Map(profile.answers.map((answer) => [answer.key, answer]));
  const enabledFields = fields.filter((field) => field.enabled);
  const answers = enabledFields.flatMap((field) => {
    const profileKey = field.key ?? field.id;
    if (field.custom || !PREFILLABLE_KEYS.has(profileKey)) return [];
    const answer = profileAnswers.get(profileKey);
    return answer ? [{ ...answer, key: field.id, label: field.label }] : [];
  });
  const answeredKeys = new Set(answers.map((answer) => answer.key));
  const requiredFields = enabledFields.filter((field) => field.required);

  return {
    answers,
    filledCount: requiredFields.filter((field) => answeredKeys.has(field.id)).length,
    requiredCount: requiredFields.length,
    missingKeys: requiredFields.filter((field) => !answeredKeys.has(field.id)).map((field) => field.id),
  };
}

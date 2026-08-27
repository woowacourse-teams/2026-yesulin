import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import { orderedApplicationPhotos } from "./application-form-state";
import { applicationLinkKey, MAX_APPLICATION_LINKS } from "./application-links";
import type { ApplicationPhoto, CareerDraft } from "./application-form-state";
import type { ApplicantAnswerValue, CareerEntry, ProfilePrefillResponse } from "@/features/applicants/types";

export function applicationDraftFromPrefill(prefill?: ProfilePrefillResponse, fields: readonly ApplicationFieldInput[] = []) {
  const values: Record<string, string> = {};
  let photos: ApplicationPhoto[] = [];
  let videoUrl = "";
  let careers: CareerDraft[] = [];
  for (const answer of prefill?.answers ?? []) {
    if (answer.key === "PHOTOS") {
      // 보관함 사진은 지원서마다 사용자가 직접 고른다. 프로필 prefill로 자동 첨부하지 않는다.
      photos = [];
    } else if (answer.key === "VIDEO" && typeof answer.value === "string") {
      const videoField = fields.find((field) => field.id === answer.key && field.inputType === "URL" && field.section === "MATERIALS");
      const firstRequirement = videoField?.config.videoRequirements?.[0];
      if (firstRequirement) values[`${answer.key}.${firstRequirement.id}`] = answer.value;
      else videoUrl = answer.value;
    } else if (answer.key === "CAREER" && Array.isArray(answer.value)) {
      careers = answer.value.filter(isCareerEntry).map((career, index) => ({ id: `prefill-career-${index}`, title: career.title, part: career.part, year: String(career.year) }));
    } else if (answer.key === "LINK" && Array.isArray(answer.value)) {
      answer.value
        .filter((item): item is string => typeof item === "string" && Boolean(item.trim()))
        .slice(0, MAX_APPLICATION_LINKS)
        .forEach((link, index) => { values[applicationLinkKey(index)] = link; });
    } else if (typeof answer.value === "object" && answer.value !== null && !Array.isArray(answer.value) && "height" in answer.value && "weight" in answer.value) {
      values[`${answer.key}.height`] = String(answer.value.height);
      values[`${answer.key}.weight`] = String(answer.value.weight);
    } else if (typeof answer.value === "string" || typeof answer.value === "number") {
      values[answer.key] = String(answer.value);
    }
  }
  return { values, photos, videoUrl, careers };
}

function isCareerEntry(value: unknown): value is CareerEntry {
  return typeof value === "object" && value !== null && "year" in value && "title" in value && "part" in value;
}

export function submissionValue(field: ApplicationFieldInput, draft: {
  readonly values: Readonly<Record<string, string>>;
  readonly photos: readonly ApplicationPhoto[];
  readonly videoUrl: string;
  readonly careers: readonly CareerDraft[];
  readonly noCareer: boolean;
}): ApplicantAnswerValue {
  if (field.inputType === "FILE") return orderedApplicationPhotos(draft.photos).filter((photo) => photo.status === "READY").map((photo) => photo.id);
  if (field.inputType === "URL" && field.section === "MATERIALS") {
    const requirements = field.config.videoRequirements ?? [];
    return requirements.length > 0
      ? requirements.map((requirement) => draft.values[`${field.id}.${requirement.id}`] ?? "")
      : draft.videoUrl;
  }
  if (field.id === "CAREER") return draft.noCareer ? [] : draft.careers.map((career) => ({ year: Number(career.year), title: career.title, part: career.part }));
  if (field.inputType === "COMPOSITE") return Object.fromEntries((field.config.fields ?? []).map((part) => [part.key, Number(draft.values[`${field.id}.${part.key}`] ?? 0)])) as { height: number; weight: number };
  if (field.inputType === "NUMBER") return Number(draft.values[field.id] ?? 0);
  return draft.values[field.id] ?? "";
}

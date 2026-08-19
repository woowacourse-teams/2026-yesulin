import type { ApplicantAnswerValue } from "@/features/applicants/types";
import type { ApplicationFieldInput } from "@/features/auditions/creation-types";

export function hasSubmittedValue(value: ApplicantAnswerValue): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object" && value !== null) {
    return Object.values(value).some((candidate) =>
      typeof candidate === "number"
        ? Number.isFinite(candidate) && candidate > 0
        : typeof candidate === "string" && candidate.trim().length > 0,
    );
  }
  return false;
}

export function photoSlotLabels(field: ApplicationFieldInput | undefined, count: number): readonly string[] {
  const fallback = field?.label.trim() || "사진";
  const configured = (field?.config.photoRequirements ?? []).flatMap((requirement) => {
    const description = requirement.description.trim() || fallback;
    return Array.from({ length: Math.max(0, requirement.count) }, (_, index) =>
      requirement.count > 1 ? `${description} ${index + 1}` : description,
    );
  });
  return Array.from({ length: count }, (_, index) =>
    configured[index] ?? (count > 1 ? `${fallback} ${index + 1}` : fallback),
  );
}

export function videoSlotLabels(field: ApplicationFieldInput | undefined, count: number): readonly string[] {
  const fallback = field?.label.trim() || "영상";
  const configured = (field?.config.videoRequirements ?? []).map((requirement) => requirement.description.trim() || fallback);
  return Array.from({ length: count }, (_, index) => configured[index] ?? (count > 1 ? `${fallback} ${index + 1}` : fallback));
}

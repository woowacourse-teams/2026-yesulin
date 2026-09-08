import type { EducationInformation, EducationLevel } from "./types";

export function educationInformation(value: unknown): EducationInformation {
  if (!isEducationInformation(value)) return { level: null, school: "", major: "" };
  return {
    level: value.level,
    school: value.school,
    major: value.major,
  };
}

export function isEducationInformation(value: unknown): value is EducationInformation {
  return typeof value === "object" && value !== null && "level" in value && "school" in value && "major" in value;
}

export function educationText(value: Pick<EducationInformation, "level" | "school" | "major">) {
  if (value.level === "NONE") return "학력 없음";
  if (value.level === "UNIVERSITY") return [value.school, value.major].filter(Boolean).join(" · ") || "대학교 졸업";
  if (value.level === "HIGH_SCHOOL") return value.school || "고등학교 졸업";
  return [value.school, value.major].filter(Boolean).join(" · ") || "미수집";
}

export function isEducationLevel(value: string): value is EducationLevel {
  return value === "NONE" || value === "HIGH_SCHOOL" || value === "UNIVERSITY";
}

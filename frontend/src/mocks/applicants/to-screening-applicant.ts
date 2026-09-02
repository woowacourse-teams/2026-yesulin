import type { ApplicantSubmissionDetail, ApplicantAnswer, CareerEntry } from "@/features/applicants/types";
import { educationInformation } from "@/features/applicants/education";
import { roleId, type Gender, type PerformanceId } from "@/features/auditions/types";
import { photoSlotLabels, videoSlotLabels } from "@/features/applications/materials";
import type { MockApplicant } from "../auditions/applicants";
import { fallbackPhoto } from "../auditions/photos";

const answerOf = (answers: readonly ApplicantAnswer[], key: string) =>
  answers.find((answer) => answer.key === key)?.value;

const textOf = (answers: readonly ApplicantAnswer[], key: string) => {
  const value = answerOf(answers, key);
  return typeof value === "string" ? value : "";
};

const videosOf = (detail: ApplicantSubmissionDetail) => {
  const field = detail.applicationFields.find((candidate) => candidate.id === "VIDEO");
  const answers = detail.answers;
  const value = answerOf(answers, "VIDEO");
  const urls = typeof value === "string"
    ? [value]
    : Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string" && item.trim().length > 0)
      : [];
  const labels = videoSlotLabels(field, urls.length);
  return urls.map((url, index) => ({ label: labels[index] ?? `영상 ${index + 1}`, url }));
};

const genderOf = (value: string): Gender => value === "남성" || value === "MALE" ? "MALE" : "FEMALE";

const numberOf = (answers: readonly ApplicantAnswer[], key: string) => {
  const value = answerOf(answers, key);
  return typeof value === "number" && Number.isFinite(value) ? value : null;
};

const careerOf = (value: ApplicantAnswer["value"] | undefined): readonly CareerEntry[] =>
  Array.isArray(value) ? value.filter((item): item is CareerEntry => typeof item === "object" && item !== null && "year" in item && "title" in item && "part" in item) : [];

/** 배우용 제출 스냅샷을 기획사/제작사 심사 읽기 모델의 원본으로 변환한다. */
export function toScreeningApplicant(detail: ApplicantSubmissionDetail, performanceId: PerformanceId): MockApplicant {
  const birth = textOf(detail.answers, "BIRTH");
  const birthYear = Number(birth.slice(0, 4));
  const name = textOf(detail.answers, "NAME") || "이름 미입력";
  const photoIds = answerOf(detail.answers, "PHOTOS");
  const photoAnswer = detail.answers.find((answer) => answer.key === "PHOTOS");
  const photoField = detail.applicationFields.find((field) => field.id === "PHOTOS");
  const photoCount = Array.isArray(photoIds) ? photoIds.filter((value): value is string => typeof value === "string").length : 0;
  const photoLabels = photoSlotLabels(photoField, photoCount);
  const photos = Array.isArray(photoIds) ? photoIds.filter((value): value is string => typeof value === "string").map((id, index) => ({
    label: photoLabels[index] ?? `제출 사진 ${index + 1}`,
    url: photoAnswer?.previewUrls?.[index] || id,
    fallbackUrl: fallbackPhoto(name, index),
  })) : [];
  const selectedRoleIds = detail.selectedRoles.map((role) => roleId(role.roleId));
  const selectedRoleNames = detail.selectedRoles.map((role) => role.roleName);
  const education = educationInformation(answerOf(detail.answers, "SCHOOL"));

  return {
    id: detail.id,
    name,
    gender: genderOf(textOf(detail.answers, "GENDER")),
    age: Number.isInteger(birthYear) ? new Date(detail.submittedAt).getFullYear() - birthYear : 0,
    height: numberOf(detail.answers, "HEIGHT"),
    weight: numberOf(detail.answers, "WEIGHT"),
    performanceId,
    postingId: detail.postingId as MockApplicant["postingId"],
    roleId: selectedRoleIds[0]!,
    roleIds: selectedRoleIds,
    roleName: selectedRoleNames.join(" · "),
    birth: birth.replaceAll("-", ".").slice(0, 7),
    phone: textOf(detail.answers, "PHONE"),
    email: textOf(detail.answers, "EMAIL"),
    school: education.school,
    educationLevel: education.level,
    major: education.major,
    submittedAt: detail.submittedAt,
    career: careerOf(answerOf(detail.answers, "CAREER")),
    coverLetter: textOf(detail.answers, "COVER_LETTER"),
    motivation: textOf(detail.answers, "MOTIVATION"),
    photos,
    videos: videosOf(detail),
  };
}

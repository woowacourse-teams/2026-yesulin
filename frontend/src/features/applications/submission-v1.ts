import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import { request } from "@/features/auditions/api-client";
import type { FileUploadResource } from "@/features/auditions/backend-resources";
import { submissionId, type SubmissionId } from "@/features/auditions/types";
import { safeUpload, SafeUploadError, uploadSequentially } from "@/features/files/safe-upload";
import { reportUploadDiagnostic } from "@/features/files/upload-diagnostics";
import { orderedApplicationPhotos } from "./application-form-state";
import type { ApplicationPhoto, CareerDraft } from "./application-form-state";
import { applicationLinks } from "./application-links";
import {
  readPublicApplicationSubmissionAttempt,
  savePublicApplicationSubmissionAttempt,
  type PublicApplicationSubmissionAttempt,
} from "./public-application-draft-store";

export type V1SubmissionInput = {
  readonly auditionId: string;
  readonly fields: readonly ApplicationFieldInput[];
  readonly values: Readonly<Record<string, string>>;
  readonly photos: readonly ApplicationPhoto[];
  readonly videoUrl: string;
  readonly careers: readonly CareerDraft[];
  readonly noCareer: boolean;
  readonly roleIds: readonly string[];
  readonly privacyConsent: boolean;
  readonly thirdPartyConsent: boolean;
};

export type V1SubmissionRequest = {
  readonly basicInformation: {
    readonly name: string | null;
    readonly height: number | null;
    readonly weight: number | null;
    readonly birthDate: string | null;
    readonly gender: "FEMALE" | "MALE" | null;
    readonly phone: string | null;
    readonly email: string | null;
    readonly address: string | null;
  };
  readonly additionalInformation: {
    readonly school: string | null;
    readonly links: readonly string[];
    readonly nationality: string | null;
    readonly coverLetter: string | null;
    readonly specialty: string | null;
    readonly hobbies: string | null;
    readonly militaryServiceStatus: "COMPLETED" | "NOT_COMPLETED" | "NOT_APPLICABLE" | null;
    readonly careers: readonly { readonly year: number; readonly title: string; readonly roleName: string }[];
  };
  readonly selectedRoleIds: readonly number[];
  readonly formAnswers: {
    readonly questionAnswers: readonly { readonly questionId: number; readonly answer: string }[];
    readonly photoRequirementAnswers: readonly { readonly photoRequirementId: number; readonly fileId: number }[];
    readonly videoRequirementAnswers: readonly { readonly videoRequirementId: number; readonly url: string }[];
  };
  readonly consents: {
    readonly privacyCollectionAndUseAgreed: boolean;
    readonly thirdPartyProvisionAgreed: boolean;
  };
};

export type V1SubmissionReceipt = {
  readonly submissionId: SubmissionId;
  readonly submittedAt: string;
};

const submissionAttemptPreparations = new Map<string, Promise<PublicApplicationSubmissionAttempt>>();
const volatileSubmissionAttempts = new Map<string, PublicApplicationSubmissionAttempt>();

export class ApplicationPhotoReadError extends Error {
  readonly photoId: string;

  constructor(photoId: string, options?: ErrorOptions) {
    super(
      options?.cause instanceof SafeUploadError
        ? options.cause.message
        : "저장된 사진을 불러오지 못했습니다. 해당 사진을 다시 선택해 주세요.",
      options,
    );
    this.name = "ApplicationPhotoReadError";
    this.photoId = photoId;
  }
}

export type ApplicantInformation = {
  readonly basicInformation: V1SubmissionRequest["basicInformation"];
  readonly additionalInformation: V1SubmissionRequest["additionalInformation"];
};

export type ApplicantInformationInput = Pick<V1SubmissionInput, "fields" | "values" | "careers" | "noCareer">;

/** 제출 본문과 제출 후 프로필 저장이 같은 값을 쓰도록 공고가 수집한 기본·추가 정보만 추린다. */
export function applicantInformation(input: ApplicantInformationInput): ApplicantInformation {
  const enabledKeys = new Set(input.fields.filter((field) => field.enabled && !field.custom).map((field) => field.key ?? field.id));
  const text = (key: string) => enabledKeys.has(key) ? nullableText(input.values[key]) : null;
  const integer = (key: string) => {
    const value = text(key);
    return value === null ? null : Number(value);
  };


  return {
    basicInformation: {
      name: text("NAME"),
      height: integer("HEIGHT"),
      weight: integer("WEIGHT"),
      birthDate: text("BIRTH"),
      gender: genderOf(text("GENDER")),
      phone: text("PHONE"),
      email: text("EMAIL"),
      address: text("ADDRESS"),
    },
    additionalInformation: {
      school: text("SCHOOL"),
      links: applicationLinks(input.values),
      nationality: text("NATIONALITY"),
      coverLetter: text("COVER_LETTER"),
      specialty: text("SPECIALTY"),
      hobbies: text("HOBBIES"),
      militaryServiceStatus: militaryStatusOf(text("MILITARY")),
      careers: enabledKeys.has("CAREER") && !input.noCareer
        ? input.careers.map((career) => ({ year: Number(career.year), title: career.title.trim(), roleName: career.part.trim() }))
        : [],
    },
  };
}

export async function createV1Submission(input: V1SubmissionInput): Promise<V1SubmissionReceipt> {
  const attempt = await resolveSubmissionAttempt(input);
  const response = await request<{ readonly submissionId: string }>(
    `/v1/auditions/${encodeURIComponent(input.auditionId)}/submissions`,
    {
      method: "POST",
      headers: { "Idempotency-Key": attempt.idempotencyKey },
      body: attempt.requestBody,
    },
  );
  return { submissionId: submissionId(response.submissionId), submittedAt: new Date().toISOString() };
}

async function resolveSubmissionAttempt(input: V1SubmissionInput) {
  const pending = submissionAttemptPreparations.get(input.auditionId);
  if (pending) return pending;
  const preparation = loadOrCreateSubmissionAttempt(input);
  submissionAttemptPreparations.set(input.auditionId, preparation);
  try {
    return await preparation;
  } finally {
    if (submissionAttemptPreparations.get(input.auditionId) === preparation) {
      submissionAttemptPreparations.delete(input.auditionId);
    }
  }
}

async function loadOrCreateSubmissionAttempt(input: V1SubmissionInput) {
  const inputFingerprint = submissionInputFingerprint(input);
  const storedAttempt = await readPublicApplicationSubmissionAttempt(input.auditionId)
    .catch(() => volatileSubmissionAttempts.get(input.auditionId));
  return storedAttempt?.inputFingerprint === inputFingerprint
    ? storedAttempt
    : createSubmissionAttempt(input, inputFingerprint);
}

async function createSubmissionAttempt(input: V1SubmissionInput, inputFingerprint: string) {
  const attempt: PublicApplicationSubmissionAttempt = {
    postingId: input.auditionId,
    idempotencyKey: createIdempotencyKey(),
    inputFingerprint,
    requestBody: JSON.stringify(await toV1SubmissionRequest(input)),
  };
  try {
    await savePublicApplicationSubmissionAttempt(attempt);
  } catch (cause) {
    console.error("[지원서 제출 재시도 정보 저장 실패]", cause);
  }
  volatileSubmissionAttempts.set(input.auditionId, attempt);
  return attempt;
}

function createIdempotencyKey() {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function submissionInputFingerprint(input: V1SubmissionInput) {
  return JSON.stringify({
    auditionId: input.auditionId,
    fields: input.fields,
    values: input.values,
    photos: orderedApplicationPhotos(input.photos).map((photo) => ({
      id: photo.id,
      name: photo.name,
      size: photo.blob?.size,
      type: photo.blob?.type,
      libraryFileId: photo.libraryFileId,
    })),
    videoUrl: input.videoUrl,
    careers: input.careers,
    noCareer: input.noCareer,
    roleIds: input.roleIds,
    privacyConsent: input.privacyConsent,
    thirdPartyConsent: input.thirdPartyConsent,
  });
}

async function toV1SubmissionRequest(input: V1SubmissionInput): Promise<V1SubmissionRequest> {
  const selectedRoleIds = input.roleIds.map((value) => positiveId(value, "지원할 배역을 다시 선택해 주세요."));

  return {
    ...applicantInformation(input),
    selectedRoleIds,
    formAnswers: {
      questionAnswers: questionAnswers(input.fields, input.values),
      photoRequirementAnswers: await photoRequirementAnswers(input.fields, input.photos),
      videoRequirementAnswers: videoRequirementAnswers(input.fields, input.values, input.videoUrl),
    },
    consents: {
      privacyCollectionAndUseAgreed: input.privacyConsent,
      thirdPartyProvisionAgreed: input.thirdPartyConsent,
    },
  };
}

function questionAnswers(fields: readonly ApplicationFieldInput[], values: Readonly<Record<string, string>>) {
  return fields.filter((field) => field.enabled && field.custom).flatMap((field) => {
    const answer = values[field.id]?.trim() ?? "";
    if (!field.required && !answer) return [];
    return [{ questionId: positiveId(field.id.replace(/^question-/, ""), "추가 질문 정보를 불러오지 못했습니다."), answer }];
  });
}

async function photoRequirementAnswers(fields: readonly ApplicationFieldInput[], photos: readonly ApplicationPhoto[]) {
  const requirements = fields.find((field) => field.enabled && field.id === "PHOTOS")?.config.photoRequirements ?? [];
  const requirementIds = requirements.flatMap((requirement) =>
    Array.from({ length: requirement.count }, () => positiveId(requirement.id, "사진 요구사항 정보를 불러오지 못했습니다.")),
  );
  const readyPhotos = orderedApplicationPhotos(photos).filter((photo) => photo.status === "READY");
  if (requirementIds.length !== readyPhotos.length) throw new Error("사진 요구사항에 맞는 사진을 다시 선택해 주세요.");
  // 20MB 사진의 원본·ArrayBuffer·복사 Blob이 여러 장 동시에 메모리에 남지 않도록 순서대로 처리한다.
  const fileIds = await uploadSequentially(readyPhotos, actorPhotoFileId);
  return fileIds.map((fileId, index) => ({ photoRequirementId: requirementIds[index]!, fileId }));
}

function videoRequirementAnswers(fields: readonly ApplicationFieldInput[], values: Readonly<Record<string, string>>, videoUrl: string) {
  const requirements = fields.find((field) => field.enabled && field.id === "VIDEO")?.config.videoRequirements ?? [];
  if (!requirements.length) return [];
  return requirements.map((requirement, index) => ({
    videoRequirementId: positiveId(requirement.id, "영상 요구사항 정보를 불러오지 못했습니다."),
    url: (values[`VIDEO.${requirement.id}`] ?? (index === 0 ? videoUrl : "")).trim(),
  }));
}

/** 보관함에서 고른 사진은 이미 올라간 파일을 그대로 쓰고, 새로 고른 사진만 업로드한다. */
async function actorPhotoFileId(photo: ApplicationPhoto) {
  if (photo.libraryFileId) return photo.libraryFileId;
  if (!photo.blob) throw new Error("사진을 다시 선택해 주세요. 보관함 사진은 프로필에서 다시 불러올 수 있어요.");
  try {
    const result = await safeUpload({
      flow: "APPLICATION_PHOTO",
      source: photo.blob,
      originalFilename: photo.name,
      requestUpload: (metadata, { incidentId }) => request<FileUploadResource>("/v1/actor-photos/upload-requests", {
        method: "POST",
        headers: { "X-Request-Id": incidentId },
        body: JSON.stringify(metadata),
      }),
      completeUpload: (fileId, { incidentId }) => request<void>(`/v1/actor-photos/${fileId}/completion`, {
        method: "PATCH",
        headers: { "X-Request-Id": incidentId },
      }),
      reportDiagnostic: reportUploadDiagnostic,
    });
    return result.fileId;
  } catch (cause) {
    if (cause instanceof SafeUploadError) {
      throw new ApplicationPhotoReadError(photo.id, { cause });
    }
    throw cause;
  }
}

function nullableText(value: string | undefined) {
  const normalized = value?.trim() ?? "";
  return normalized || null;
}

function positiveId(value: string, message: string) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed <= 0) throw new Error(message);
  return parsed;
}

function genderOf(value: string | null): "FEMALE" | "MALE" | null {
  if (value === "여성" || value?.toUpperCase() === "FEMALE") return "FEMALE";
  if (value === "남성" || value?.toUpperCase() === "MALE") return "MALE";
  return null;
}

function militaryStatusOf(value: string | null): "COMPLETED" | "NOT_COMPLETED" | "NOT_APPLICABLE" | null {
  if (value === "군필" || value?.toUpperCase() === "COMPLETED") return "COMPLETED";
  if (value === "미필" || value?.toUpperCase() === "NOT_COMPLETED") return "NOT_COMPLETED";
  if (value === "해당 없음" || value?.toUpperCase() === "NOT_APPLICABLE") return "NOT_APPLICABLE";
  return null;
}

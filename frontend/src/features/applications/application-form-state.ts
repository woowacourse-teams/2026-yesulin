import type { ApplicationFormStep } from "./application-form";
import { isCompleteKoreaRegion } from "@/features/applicants/korea-regions";
import { integerMeasurementError, isIntegerMeasurement } from "@/features/applicants/profile-input";
import { isValidBirthDate } from "@/components/ui/birth-date-input";

export const MAX_PHOTO_COUNT = 3;
export const MAX_PHOTO_SIZE_BYTES = 20 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);

export type UploadStatus = "UPLOADING" | "READY" | "ERROR";

export type ApplicationPhoto = {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly status: UploadStatus;
  /** 지원서 안에서 공고가 요청한 사진 슬롯의 순서. 기존 Draft는 배열 순서를 사용한다. */
  readonly slotIndex?: number;
  readonly blob?: Blob;
  /** 사진 보관함에서 고른 사진이 이미 올라가 있는 파일. 있으면 다시 업로드하지 않는다. */
  readonly libraryFileId?: number;
  readonly error?: string;
};

export function orderedApplicationPhotos(photos: readonly ApplicationPhoto[]): readonly ApplicationPhoto[] {
  return photos
    .map((photo, index) => ({ photo, slotIndex: photo.slotIndex ?? index }))
    .sort((left, right) => left.slotIndex - right.slotIndex)
    .map(({ photo }) => photo);
}

export type CareerDraft = { readonly id: string; readonly title: string; readonly part: string; readonly year: string };
export type SubmissionState = "IDLE" | "SUBMITTING" | "ERROR";
export type ApplicationStepIssue = { readonly message: string; readonly fieldId: string };

/** 저장할 의미가 있는 지원서 Draft인지 판정한다. */
export function hasApplicationDraft({
  values,
  photos,
  videoUrl,
  noCareer,
  careers,
  consent,
  submitted,
}: {
  values: Readonly<Record<string, string>>;
  photos: readonly ApplicationPhoto[];
  videoUrl: string;
  noCareer: boolean;
  careers: readonly CareerDraft[];
  consent: boolean;
  submitted: boolean;
}) {
  if (submitted) return false;
  return Object.values(values).some((value) => value.trim().length > 0)
    || photos.length > 0
    || videoUrl.trim().length > 0
    || noCareer
    || careers.length > 0
    || consent;
}

export function imageFileError(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) return "JPG, PNG, WEBP 형식의 이미지만 등록할 수 있어요.";
  if (file.size > MAX_PHOTO_SIZE_BYTES) return "사진 파일은 20MB 이하여야 해요.";
  return null;
}

export function youtubeVideoId(value: string): string | null {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const hostname = url.hostname.toLowerCase();
    let candidate: string | null | undefined;
    if (hostname === "youtu.be") {
      candidate = url.pathname.split("/").filter(Boolean)[0];
    } else if (YOUTUBE_HOSTS.has(hostname)) {
      if (url.pathname === "/watch") candidate = url.searchParams.get("v");
      else {
        const [kind, id] = url.pathname.split("/").filter(Boolean);
        if (kind === "shorts" || kind === "embed") candidate = id;
      }
    }
    return candidate && YOUTUBE_ID.test(candidate) ? candidate : null;
  } catch {
    return null;
  }
}

export function applicationStepError({
  step,
  photos,
  videoUrl,
  noCareer,
  careers,
  values,
}: {
  step: ApplicationFormStep;
  photos: readonly ApplicationPhoto[];
  videoUrl: string;
  noCareer: boolean;
  careers: readonly CareerDraft[];
  values: Readonly<Record<string, string>>;
}): string | null {
  return applicationStepIssue({ step, photos, videoUrl, noCareer, careers, values })?.message ?? null;
}

/** 검증 규칙은 유지하면서 오류를 안내할 실제 입력 항목도 함께 찾는다. */
export function applicationStepIssue({
  step,
  photos,
  videoUrl,
  noCareer,
  careers,
  values,
}: {
  step: ApplicationFormStep;
  photos: readonly ApplicationPhoto[];
  videoUrl: string;
  noCareer: boolean;
  careers: readonly CareerDraft[];
  values: Readonly<Record<string, string>>;
}): ApplicationStepIssue | null {
  const regularField = step.fields.find((candidate) => candidate.id !== "CAREER" && candidate.section !== "MATERIALS" && applicationFieldError(candidate, values));
  if (regularField) return { fieldId: regularField.id, message: applicationFieldError(regularField, values)! };
  if (step.key === "media") {
    const photosField = step.fields.find((field) => field.inputType === "FILE");
    const videoField = step.fields.find((field) => field.inputType === "URL");
    const requestedPhotos = photosField?.config.photoRequirements?.reduce((sum, item) => sum + item.count, 0);
    const photoLimit = Math.min(MAX_PHOTO_COUNT, Math.max(1, requestedPhotos ?? photosField?.config.maxCount ?? MAX_PHOTO_COUNT));
    const readyPhotoCount = photos.filter((photo) => photo.status === "READY").length;
    if (photos.some((photo) => photo.status === "UPLOADING") && photosField) return { fieldId: photosField.id, message: "사진 업로드가 완료될 때까지 기다려 주세요." };
    if (readyPhotoCount > photoLimit && photosField) return { fieldId: photosField.id, message: `${photosField.label}은(는) 최대 ${photoLimit}장까지 등록할 수 있어요.` };
    if (photosField && (photosField.required || readyPhotoCount > 0) && readyPhotoCount < photoLimit) return { fieldId: photosField.id, message: `${photosField.label}을(를) 요구사항에 맞게 ${photoLimit}장 등록해 주세요.` };
    const videoRequirements = videoField?.config.videoRequirements ?? [];
    if (videoField && videoRequirements.length > 0) {
      const submittedVideoCount = videoRequirements.filter((requirement) => (values[`${videoField.id}.${requirement.id}`] ?? "").trim()).length;
      for (const requirement of videoRequirements) {
        const value = values[`${videoField.id}.${requirement.id}`] ?? "";
        if (value.trim() && !youtubeVideoId(value)) return { fieldId: `${videoField.id}.${requirement.id}`, message: `${requirement.description}의 유튜브 링크를 정확히 입력해 주세요.` };
        if ((videoField.required || submittedVideoCount > 0) && !youtubeVideoId(value)) return { fieldId: `${videoField.id}.${requirement.id}`, message: `${requirement.description} 링크를 입력해 주세요.` };
      }
    } else {
      if (videoField && videoUrl.trim() && !youtubeVideoId(videoUrl)) return { fieldId: videoField.id, message: `${videoField.label}의 유튜브 링크를 정확히 입력해 주세요.` };
      if (videoField?.required && !youtubeVideoId(videoUrl)) return { fieldId: videoField.id, message: `${videoField.label}의 유튜브 링크를 입력해 주세요.` };
    }
  }
  const field = step.fields.find((candidate) => candidate.id === "CAREER");
  if (field) {
    if (field.required && !noCareer && careers.length === 0) return { fieldId: field.id, message: `${field.label}을(를) 추가하거나 경력 없음에 체크해 주세요.` };
    const invalidCareer = careers.find((career) => careerDraftError(career));
    if (!noCareer && invalidCareer) return { fieldId: `${field.id}-${invalidCareer.id}`, message: `${field.label}의 작품명, 배역, 연도를 모두 입력해 주세요.` };
  }
  return null;
}

export function careerDraftError(career: CareerDraft): string | null {
  if (!career.title.trim()) return "작품명을 입력해 주세요.";
  if (!career.part.trim()) return "맡은 배역을 입력해 주세요.";
  if (!/^\d{4}$/.test(career.year)) return "연도를 네 자리로 입력해 주세요.";
  return null;
}

function applicationFieldError(field: ApplicationFormStep["fields"][number], values: Readonly<Record<string, string>>) {
  if (field.inputType === "COMPOSITE") {
    const missing = field.config.fields?.some((part) => !values[`${field.id}.${part.key}`]?.trim());
    return field.required && missing ? `${field.label} 항목을 입력해 주세요.` : null;
  }

  const value = values[field.id]?.trim() ?? "";
  if (field.inputType === "REGION") {
    if (!field.required && !value) return null;
    return isCompleteKoreaRegion(value) ? null : `${field.label}을(를) 시·도와 시·군·구까지 선택해 주세요.`;
  }
  if (field.inputType === "DATE" && field.id === "BIRTH") {
    if (!value) return field.required ? `${field.label} 항목을 입력해 주세요.` : null;
    return isValidBirthDate(value) ? null : `${field.label}을(를) 숫자 8자리로 입력해 주세요. 예: 19990315`;
  }
  if (field.required && !value) return `${field.label} 항목을 입력해 주세요.`;
  if (value && field.inputType === "NUMBER" && !isIntegerMeasurement(value)) return integerMeasurementError(field.label);
  if (value && field.inputType === "SELECT" && field.config.options?.length && !field.config.options.includes(value)) return `${field.label} 선택값을 다시 확인해 주세요.`;
  if (value && field.config.minLength && value.length < field.config.minLength) return `${field.label}은(는) ${field.config.minLength}자 이상 입력해 주세요.`;
  if (value && field.config.maxLength && value.length > field.config.maxLength) return `${field.label}은(는) ${field.config.maxLength}자 이하로 입력해 주세요.`;
  return null;
}

import type { ApplicationFormStep } from "./application-form";

export const MAX_PHOTO_COUNT = 4;
export const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com"]);

export type UploadStatus = "UPLOADING" | "READY";

export type ApplicationPhoto = {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly status: UploadStatus;
};

export type CareerDraft = { readonly id: string; readonly title: string; readonly part: string; readonly year: string };
export type SubmissionState = "IDLE" | "SUBMITTING" | "ERROR";

export function imageFileError(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) return "JPG, PNG, WEBP 형식의 이미지만 등록할 수 있어요.";
  if (file.size > MAX_PHOTO_SIZE_BYTES) return "사진 파일은 10MB 이하여야 해요.";
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
  if (step.section === "BASIC" || step.section === "CUSTOM") {
    const incomplete = step.fields.find((field) => {
      if (!field.required) return false;
      if (field.inputType === "COMPOSITE") return field.config.fields?.some((part) => !values[`${field.id}.${part.key}`]?.trim());
      return !values[field.id]?.trim();
    });
    if (incomplete) return `${incomplete.label} 항목을 입력해 주세요.`;
  }
  if (step.section === "MATERIALS") {
    const photosField = step.fields.find((field) => field.inputType === "FILE");
    const videoField = step.fields.find((field) => field.inputType === "URL");
    if (photos.some((photo) => photo.status === "UPLOADING")) return "사진 업로드가 완료될 때까지 기다려 주세요.";
    if (photosField?.required && !photos.some((photo) => photo.status === "READY")) return "프로필 사진을 1장 이상 등록해 주세요.";
    if (videoField?.required && !youtubeVideoId(videoUrl)) return "유튜브 링크를 정확히 입력해 주세요.";
  }
  if (step.section === "CAREER") {
    const field = step.fields[0];
    if (field?.required && !noCareer && careers.length === 0) return "경력을 추가하거나 경력 없음에 체크해 주세요.";
    if (!noCareer && careers.some((career) => !career.title.trim() || !career.part.trim() || !/^\d{4}$/.test(career.year))) return "모든 경력에 작품명, 배역, 연도를 입력해 주세요.";
  }
  return null;
}

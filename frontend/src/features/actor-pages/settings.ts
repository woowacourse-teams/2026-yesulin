import { SITE_URL } from "@/config/site";
import type { ApplicantAnswerValue, ApplicantProfilePhoto, ApplicantProfileResponse } from "@/features/applicants/types";
import { actorPageRoutes } from "./types";

export type ActorPageVisibility = "PUBLIC" | "PRIVATE";
export type ActorPageField = "education" | "careers" | "coverLetter" | "specialty" | "hobbies" | "nationality" | "links";
export type ActorPageMissingField = "HANDLE" | "NAME" | "GENDER" | "BIRTH_DATE" | "PUBLIC_PHOTO";
export type ActorPageAutoHiddenReason = "UNDER_14" | "MISSING_REQUIRED";
export type ActorHandleUnavailableReason = "INVALID_FORMAT" | "RESERVED" | "TAKEN" | "LOCKED";

/** 배우 본인이 보는 내 페이지 설정. 공개 조건은 서버가 판단해 readiness로 알려 준다. */
export type ActorPageSettings = {
  readonly publicId: string | null;
  readonly handle: string | null;
  /** 처음 공개하기 전까지만 배우가 직접 바꿀 수 있다. */
  readonly handleEditable: boolean;
  readonly status: "PRIVATE" | "PUBLIC";
  readonly autoHiddenReason: ActorPageAutoHiddenReason | null;
  readonly locked: boolean;
  readonly lockReason: string | null;
  readonly unlockedAt: string | null;
  readonly firstPublishedAt: string | null;
  readonly publishedAt: string | null;
  readonly fieldVisibilities: Readonly<Record<ActorPageField, ActorPageVisibility>>;
  readonly readiness: {
    readonly ready: boolean;
    readonly missing: readonly ActorPageMissingField[];
    readonly underAge: boolean;
    readonly locked: boolean;
  };
  readonly publishPromptShown: boolean;
  readonly consentVersion: string;
  readonly pageRepresentativePhotoId: number | null;
};

export type ActorHandleAvailability = {
  readonly handle: string;
  readonly available: boolean;
  readonly reason: ActorHandleUnavailableReason | null;
};

/**
 * 공개할 때마다 보여 주는 고지와 동의 문구. 서버의 동의 버전(`actor-page-publish-v1.0`)과 짝이며, 뜻이 바뀌게 고치면
 * 서버·목의 버전과 `docs/policies/public/privacy-consents.md`를 함께 올린다.
 */
export const ACTOR_PAGE_CONSENT_NOTICE = [
  "배우 페이지를 공개하면 이름, 성별, 출생연도·나이, 입력한 키·몸무게와 공개로 설정한 사진·영상·항목을 누구나 볼 수 있습니다.",
  "배우 목록에 표시되며 검색엔진에 수집·노출될 수 있습니다. 연락처, 전체 생년월일, 거주지, 병역 정보는 공개 페이지에 표시하지 않습니다.",
  "언제든 배우 페이지를 비공개로 바꿀 수 있습니다. 이미 외부에서 저장한 사본이나 검색 결과는 즉시 사라지지 않을 수 있습니다.",
] as const;
export const ACTOR_PAGE_CONSENT_LABEL = "위 내용을 확인하고 배우 페이지 공개에 동의합니다.";

/** 문구 초안이다. '공연사만' 영상을 볼 수 있는 사람이 바뀌면 함께 고친다. */
export const PRODUCER_ONLY_VIDEO_GUIDE = "지금은 예술in 운영자만 볼 수 있어요. 공연사 인증이 생기면 인증된 공연사에게 보여요.";

export const ACTOR_HANDLE_CONTACT_EMAIL = "contact@yesulin.art";

/** 화면에 보이는 페이지 주소. `yesulin.art/actors/@아이디`처럼 프로토콜을 뺀다. */
export function actorPageAddress(handle: string): string {
  return `${SITE_URL.replace(/^https?:\/\//, "")}${actorPageRoutes.detail(handle)}`;
}

/** 편집 화면의 항목 순서. answerKey는 프로필에서 그 항목의 값을 찾는 키다. */
export const ACTOR_PAGE_FIELDS: readonly { readonly field: ActorPageField; readonly label: string; readonly answerKey: string }[] = [
  { field: "coverLetter", label: "자기소개", answerKey: "COVER_LETTER" },
  { field: "careers", label: "경력", answerKey: "CAREER" },
  { field: "specialty", label: "특기", answerKey: "SPECIALTY" },
  { field: "education", label: "학력", answerKey: "SCHOOL" },
  { field: "nationality", label: "국적", answerKey: "NATIONALITY" },
  { field: "hobbies", label: "취미", answerKey: "HOBBIES" },
  { field: "links", label: "외부 링크", answerKey: "LINK" },
];

const MISSING_FIELD_LABELS: Readonly<Record<ActorPageMissingField, string>> = {
  HANDLE: "아이디",
  NAME: "이름",
  GENDER: "성별",
  BIRTH_DATE: "생년월일",
  PUBLIC_PHOTO: "공개 사진",
};

export function missingFieldLabel(field: ActorPageMissingField): string {
  return MISSING_FIELD_LABELS[field];
}

export type PublishBlockers = {
  /** 배우가 채워야 하는 항목. 공개 사진은 공개 사본을 공개할 때 만들므로 공개로 설정한 사진이 있으면 뺀다. */
  readonly missing: readonly ActorPageMissingField[];
  readonly underAge: boolean;
  readonly locked: boolean;
};

/**
 * 공개하기 전에 배우가 해결해야 하는 것. 서버는 공개 사본이 있는 공개 사진만 세지만, 사본은 공개 버튼을 누를 때 만들므로
 * 공개로 설정한 사진이 하나라도 있으면 사진 조건은 채운 것으로 본다.
 */
export function publishBlockers(settings: ActorPageSettings, photos: readonly ApplicantProfilePhoto[]): PublishBlockers {
  const hasPublicPhoto = photos.some((photo) => photo.visibility === "PUBLIC");
  return {
    missing: settings.readiness.missing.filter((field) => field !== "PUBLIC_PHOTO" || !hasPublicPhoto),
    underAge: settings.readiness.underAge,
    locked: settings.locked,
  };
}

export function canPublish(blockers: PublishBlockers): boolean {
  return blockers.missing.length === 0 && !blockers.underAge && !blockers.locked;
}

/** 공개 중에 필수 항목이 빠지거나 만 14세 미만이 되어 서버가 비공개로 바꾼 이유. */
export function autoHiddenMessage(settings: ActorPageSettings, blockers: PublishBlockers): string | null {
  if (settings.status !== "PRIVATE" || !settings.autoHiddenReason) return null;
  if (settings.autoHiddenReason === "UNDER_14") return "만 14세 미만이 되어 페이지가 비공개로 바뀌었어요. 생년월일을 확인해 주세요.";
  if (!blockers.missing.length) return "공개에 필요한 항목이 빠져 페이지가 비공개로 바뀌었어요. 지금은 다시 공개할 수 있어요.";
  return `공개에 필요한 항목(${blockers.missing.map(missingFieldLabel).join(", ")})이 빠져 페이지가 비공개로 바뀌었어요. 채운 뒤 다시 공개해 주세요.`;
}

/** 운영자가 잠금을 푼 뒤 아직 다시 공개하지 않았으면 안내한다. */
export function showsUnlockedNotice(settings: ActorPageSettings): boolean {
  if (settings.locked || settings.status !== "PRIVATE" || !settings.unlockedAt) return false;
  return !settings.publishedAt || Date.parse(settings.publishedAt) < Date.parse(settings.unlockedAt);
}

/** 프로필 저장 뒤 공개 팝업을 처음 한 번만 띄운다. */
export function shouldPromptPublish(settings: ActorPageSettings): boolean {
  return settings.status === "PRIVATE" && !settings.locked && !settings.publishPromptShown;
}

const HANDLE_UNAVAILABLE_MESSAGES: Readonly<Record<ActorHandleUnavailableReason, string>> = {
  INVALID_FORMAT: "영문 소문자, 숫자, 마침표(.), 밑줄(_)로 30자까지 쓸 수 있어요. 마침표로 시작·끝나거나 연달아 쓸 수 없어요.",
  RESERVED: "쓸 수 없는 아이디예요. 다른 아이디를 입력해 주세요.",
  TAKEN: "다른 배우가 쓰고 있는 아이디예요.",
  LOCKED: "처음 공개한 뒤에는 아이디를 직접 바꿀 수 없어요.",
};

export function handleUnavailableMessage(reason: ActorHandleUnavailableReason): string {
  return HANDLE_UNAVAILABLE_MESSAGES[reason];
}

/** 페이지 대표 사진이 될 사진. 공개로 설정한 사진 중 보관함 맨 앞이다. */
export function pageRepresentativePhoto(photos: readonly ApplicantProfilePhoto[]): ApplicantProfilePhoto | null {
  return photos.find((photo) => photo.visibility === "PUBLIC") ?? null;
}

/** 공개로 켜도 보일 내용이 없는 항목을 알려 주려고 프로필에 값이 있는지 본다. */
export function profileHasValue(profile: ApplicantProfileResponse, answerKey: string): boolean {
  return hasValue(profile.answers.find((answer) => answer.key === answerKey)?.value);
}

function hasValue(value: ApplicantAnswerValue | undefined): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return Boolean(value.trim());
  if (typeof value === "number") return true;
  if (Array.isArray(value)) return value.some((item) => typeof item === "string" ? Boolean(item.trim()) : Boolean(item));
  if (typeof value === "object" && "level" in value) return Boolean(value.level || value.school.trim() || value.major.trim());
  return true;
}

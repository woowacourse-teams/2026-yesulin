import type { PerformanceId, RoleGender, RoundNumber } from "./types";

export type VenueAddress = {
  readonly roadAddress: string;
  readonly detailAddress: string;
  readonly zonecode: string;
  readonly latitude: number | null;
  readonly longitude: number | null;
};

export type PhotoRequirement = {
  readonly id: string;
  readonly description: string;
  readonly count: number;
};

export type VideoRequirement = {
  readonly id: string;
  readonly description: string;
};

/** 한 공고에서 배우에게 요청할 수 있는 영상 항목 수. 개인 영상 보관함 상한과는 별개다. */
export const MAX_VIDEO_REQUIREMENTS = 3;

export const APPLICATION_FIELD_OPTIONS = [
  { key: "NAME", label: "이름", defaultRequired: true, section: "BASIC", inputType: "TEXT", order: 10, layout: "HALF", config: { placeholder: "이름을 입력해 주세요." } },
  { key: "HEIGHT", label: "키", defaultRequired: true, section: "BASIC", inputType: "NUMBER", order: 20, layout: "HALF", config: { placeholder: "cm" } },
  { key: "WEIGHT", label: "몸무게", defaultRequired: true, section: "BASIC", inputType: "NUMBER", order: 30, layout: "HALF", config: { placeholder: "kg" } },
  { key: "BIRTH", label: "생년월일", defaultRequired: true, section: "BASIC", inputType: "DATE", order: 40, layout: "HALF", config: {} },
  { key: "GENDER", label: "성별", defaultRequired: true, section: "BASIC", inputType: "SELECT", order: 50, layout: "HALF", config: { options: ["여성", "남성"] } },
  { key: "PHONE", label: "연락처", defaultRequired: true, section: "BASIC", inputType: "TEL", order: 60, layout: "HALF", config: { placeholder: "010-0000-0000" } },
  { key: "EMAIL", label: "이메일", defaultRequired: true, section: "BASIC", inputType: "TEXT", order: 70, layout: "HALF", config: { placeholder: "name@example.com" } },
  { key: "ADDRESS", label: "주소", defaultRequired: true, section: "BASIC", inputType: "TEXT", order: 80, layout: "FULL", config: { placeholder: "예: 서울특별시 마포구" } },
  { key: "SCHOOL", label: "학력", defaultRequired: false, section: "ADDITIONAL", inputType: "TEXT", order: 10, layout: "FULL", config: { placeholder: "학교와 전공을 입력해 주세요." } },
  { key: "LINK", label: "SNS / 외부 링크", defaultRequired: false, section: "ADDITIONAL", inputType: "URL", order: 20, layout: "FULL", config: { placeholder: "https://", maxLength: 255 } },
  { key: "NATIONALITY", label: "국적", defaultRequired: false, section: "ADDITIONAL", inputType: "TEXT", order: 30, layout: "HALF", config: { placeholder: "예: 대한민국" } },
  { key: "COVER_LETTER", label: "자기소개", defaultRequired: false, section: "ADDITIONAL", inputType: "TEXTAREA", order: 40, layout: "FULL", config: { maxLength: 2000 } },
  { key: "SPECIALTY", label: "특기", defaultRequired: false, section: "ADDITIONAL", inputType: "TEXT", order: 50, layout: "HALF", config: { placeholder: "예: 현대무용, 검술" } },
  { key: "HOBBIES", label: "취미", defaultRequired: false, section: "ADDITIONAL", inputType: "TEXT", order: 60, layout: "HALF", config: { placeholder: "예: 러닝, 영화 감상" } },
  { key: "MILITARY", label: "군필 여부", defaultRequired: false, section: "ADDITIONAL", inputType: "SELECT", order: 70, layout: "HALF", config: { options: ["군필", "미필", "해당 없음"] } },
  { key: "CAREER", label: "경력", defaultRequired: false, section: "ADDITIONAL", inputType: "TEXTAREA", order: 80, layout: "FULL", config: {} },
  { key: "PHOTOS", label: "프로필 사진", defaultRequired: true, section: "MATERIALS", inputType: "FILE", order: 10, layout: "FULL", config: { maxCount: 1, photoRequirements: [{ id: "profile-photo-1", description: "프로필 사진", count: 1 }] } },
  { key: "VIDEO", label: "제출 영상", defaultRequired: true, section: "MATERIALS", inputType: "URL", order: 20, layout: "FULL", config: { placeholder: "YouTube 링크를 입력해 주세요.", maxCount: MAX_VIDEO_REQUIREMENTS, videoRequirements: [] } },
] as const;

export type ApplicationFieldKey = (typeof APPLICATION_FIELD_OPTIONS)[number]["key"];

export const APPLICATION_FIELD_SECTIONS = ["BASIC", "ADDITIONAL", "CAREER", "MATERIALS", "INTRODUCTION", "CUSTOM"] as const;
export type ApplicationFieldSection = (typeof APPLICATION_FIELD_SECTIONS)[number];

export const APPLICATION_INPUT_TYPES = ["TEXT", "TEL", "DATE", "SELECT", "NUMBER", "TEXTAREA", "URL", "FILE", "COMPOSITE"] as const;
export type ApplicationInputType = (typeof APPLICATION_INPUT_TYPES)[number];

export type ApplicationFieldLayout = "FULL" | "HALF";

export type ApplicationFieldConfig = {
  readonly placeholder?: string;
  readonly options?: readonly string[];
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly maxCount?: number;
  readonly photoRequirements?: readonly PhotoRequirement[];
  readonly videoRequirements?: readonly VideoRequirement[];
  readonly fields?: readonly ApplicationFieldPart[];
};

export type ApplicationFieldPart = {
  readonly key: string;
  readonly label: string;
  readonly inputType: Extract<ApplicationInputType, "TEXT" | "TEL" | "NUMBER">;
  readonly placeholder?: string;
  readonly unit?: string;
};

export type ApplicationFieldInput = {
  readonly id: string;
  readonly key?: ApplicationFieldKey;
  readonly label: string;
  readonly enabled: boolean;
  readonly required: boolean;
  readonly custom: boolean;
  readonly section: ApplicationFieldSection;
  readonly inputType: ApplicationInputType;
  readonly order: number;
  readonly layout: ApplicationFieldLayout;
  readonly config: ApplicationFieldConfig;
};

const INITIALLY_DISABLED = new Set<ApplicationFieldKey>(["SCHOOL", "LINK", "NATIONALITY", "COVER_LETTER", "SPECIALTY", "HOBBIES", "MILITARY", "CAREER", "VIDEO"]);

/** 공고 생성과 목 공고가 같은 지원서 필드 계약을 사용하도록 하는 기본값. */
export function defaultApplicationFields(): readonly ApplicationFieldInput[] {
  return APPLICATION_FIELD_OPTIONS.map((field) => ({
    id: field.key,
    key: field.key,
    label: field.label,
    enabled: !INITIALLY_DISABLED.has(field.key),
    required: field.defaultRequired,
    custom: false,
    section: field.section,
    inputType: field.inputType,
    order: field.order,
    layout: field.layout,
    config: field.config,
  }));
}

export type PerformanceRoleTemplate = {
  readonly id: string;
  readonly name: string;
  readonly description: string;
};

export type CreatePerformanceRequest = {
  readonly posterUrl: string;
  readonly title: string;
  readonly venue: string;
  readonly venueAddress: VenueAddress;
  readonly roles: readonly Omit<PerformanceRoleTemplate, "id">[];
};

export type PostingRoleInput = {
  readonly templateId: string;
  readonly quota: number;
  readonly gender: RoleGender;
  readonly ageMin: number;
  readonly ageMax: number;
};

export type AuditionRoundInput = {
  readonly round: RoundNumber;
  readonly name: string;
  readonly date: string;
  readonly note: string;
};

export type CreatePostingRequest = {
  readonly performanceId: PerformanceId;
  /** 과거 자유 모집 공고 호환용. 신규 공고는 항상 false다. */
  readonly isOpenCall: boolean;
  /** 한 지원서에서 여러 배역을 함께 선택할 수 있는지 여부. */
  readonly allowsMultipleRoles: boolean;
  readonly posterUrl: string;
  /** 공개 공고 본문에 표시하는 선택 상세 이미지. */
  readonly detailImageUrl: string;
  readonly title: string;
  readonly performanceStart: string;
  readonly performanceEnd: string;
  readonly recruitmentStart: string;
  readonly recruitmentEnd: string;
  /** 공연 장소와 별개로 공고별 안내하는 선택 연습 장소. */
  readonly rehearsalVenue: string;
  readonly rehearsalVenueAddress: VenueAddress;
  readonly roles: readonly PostingRoleInput[];
  readonly rounds: readonly AuditionRoundInput[];
  readonly applicationFields: readonly ApplicationFieldInput[];
  readonly applicationGuide: string;
};

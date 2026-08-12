import type { PerformanceId, RoleGender, RoundNumber } from "./types";

export const APPLICATION_FIELD_OPTIONS = [
  { key: "NAME", label: "이름", defaultRequired: true, section: "BASIC", inputType: "TEXT", order: 10, layout: "HALF", config: { placeholder: "이름을 입력해 주세요." } },
  { key: "PHONE", label: "연락처", defaultRequired: true, section: "BASIC", inputType: "TEL", order: 20, layout: "HALF", config: { placeholder: "010-0000-0000" } },
  { key: "EMAIL", label: "이메일", defaultRequired: true, section: "BASIC", inputType: "TEXT", order: 25, layout: "HALF", config: { placeholder: "name@example.com" } },
  { key: "ADDRESS", label: "거주지", defaultRequired: true, section: "BASIC", inputType: "TEXT", order: 27, layout: "HALF", config: { placeholder: "예: 서울특별시 마포구" } },
  { key: "BIRTH", label: "생년월일", defaultRequired: true, section: "BASIC", inputType: "DATE", order: 30, layout: "HALF", config: {} },
  { key: "GENDER", label: "성별", defaultRequired: true, section: "BASIC", inputType: "SELECT", order: 40, layout: "HALF", config: { options: ["여성", "남성", "응답하지 않음"] } },
  { key: "BODY", label: "키·몸무게", defaultRequired: true, section: "BASIC", inputType: "COMPOSITE", order: 50, layout: "FULL", config: { fields: [{ key: "height", label: "키", inputType: "NUMBER", placeholder: "cm", unit: "cm" }, { key: "weight", label: "몸무게", inputType: "NUMBER", placeholder: "kg", unit: "kg" }] } },
  { key: "SCHOOL", label: "학교·전공", defaultRequired: false, section: "BASIC", inputType: "TEXT", order: 60, layout: "FULL", config: { placeholder: "학교와 전공을 입력해 주세요." } },
  { key: "CAREER", label: "주요 경력", defaultRequired: true, section: "CAREER", inputType: "TEXTAREA", order: 10, layout: "FULL", config: {} },
  { key: "COVER_LETTER", label: "자기소개", defaultRequired: true, section: "INTRODUCTION", inputType: "TEXTAREA", order: 10, layout: "FULL", config: { minLength: 100 } },
  { key: "MOTIVATION", label: "지원 동기", defaultRequired: false, section: "INTRODUCTION", inputType: "TEXTAREA", order: 20, layout: "FULL", config: { minLength: 100 } },
  { key: "PHOTOS", label: "프로필 사진", defaultRequired: true, section: "MATERIALS", inputType: "FILE", order: 10, layout: "FULL", config: {} },
  { key: "VIDEO", label: "연기 영상", defaultRequired: true, section: "MATERIALS", inputType: "URL", order: 20, layout: "FULL", config: { placeholder: "YouTube 링크를 입력해 주세요." } },
] as const;

export type ApplicationFieldKey = (typeof APPLICATION_FIELD_OPTIONS)[number]["key"];

export const APPLICATION_FIELD_SECTIONS = ["BASIC", "CUSTOM", "CAREER", "MATERIALS", "INTRODUCTION"] as const;
export type ApplicationFieldSection = (typeof APPLICATION_FIELD_SECTIONS)[number];

export const APPLICATION_INPUT_TYPES = ["TEXT", "TEL", "DATE", "SELECT", "NUMBER", "TEXTAREA", "URL", "FILE", "COMPOSITE"] as const;
export type ApplicationInputType = (typeof APPLICATION_INPUT_TYPES)[number];

export type ApplicationFieldLayout = "FULL" | "HALF";

export type ApplicationFieldConfig = {
  readonly placeholder?: string;
  readonly options?: readonly string[];
  readonly minLength?: number;
  readonly maxLength?: number;
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

const INITIALLY_DISABLED = new Set<ApplicationFieldKey>(["SCHOOL", "MOTIVATION"]);

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
  readonly gender: RoleGender;
  readonly ageMin: number;
  readonly ageMax: number;
};

export type CreatePerformanceRequest = {
  readonly posterUrl: string;
  readonly title: string;
  readonly venue: string;
  readonly roles: readonly Omit<PerformanceRoleTemplate, "id">[];
};

export type PostingRoleInput = {
  readonly templateId: string;
  readonly quota: number;
};

export type AuditionRoundInput = {
  readonly round: RoundNumber;
  readonly name: string;
  readonly date: string;
  readonly note: string;
};

export type CreatePostingRequest = {
  readonly performanceId: PerformanceId;
  /** true면 선택한 한 모집 분야를 배역 구분 없이 접수한다. */
  readonly isOpenCall: boolean;
  /** 한 지원서에서 여러 배역을 함께 선택할 수 있는지 여부. */
  readonly allowsMultipleRoles: boolean;
  readonly title: string;
  readonly recruitmentStart: string;
  readonly recruitmentEnd: string;
  readonly roles: readonly PostingRoleInput[];
  readonly rounds: readonly AuditionRoundInput[];
  readonly applicationFields: readonly ApplicationFieldInput[];
  readonly applicationGuide: string;
};

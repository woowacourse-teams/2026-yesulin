import type { PerformanceId, RoleGender, RoundNumber } from "./types";

export const APPLICATION_FIELD_OPTIONS = [
  { key: "NAME", label: "이름", defaultRequired: true },
  { key: "PHONE", label: "연락처", defaultRequired: true },
  { key: "BIRTH", label: "생년월일", defaultRequired: true },
  { key: "GENDER", label: "성별", defaultRequired: true },
  { key: "BODY", label: "키·몸무게", defaultRequired: true },
  { key: "SCHOOL", label: "학교·전공", defaultRequired: false },
  { key: "CAREER", label: "주요 경력", defaultRequired: true },
  { key: "COVER_LETTER", label: "자기소개", defaultRequired: true },
  { key: "MOTIVATION", label: "지원 동기", defaultRequired: false },
  { key: "PHOTOS", label: "프로필 사진", defaultRequired: true },
  { key: "VIDEO", label: "연기 영상", defaultRequired: true },
] as const;

export type ApplicationFieldKey = (typeof APPLICATION_FIELD_OPTIONS)[number]["key"];

export type ApplicationFieldInput = {
  readonly id: string;
  readonly key?: ApplicationFieldKey;
  readonly label: string;
  readonly enabled: boolean;
  readonly required: boolean;
  readonly custom: boolean;
};

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

export type ScreeningRoundInput = {
  readonly round: RoundNumber;
  readonly name: string;
  readonly date: string;
  readonly note: string;
};

export type CreatePostingRequest = {
  readonly performanceId: PerformanceId;
  readonly title: string;
  readonly recruitmentStart: string;
  readonly recruitmentEnd: string;
  readonly roles: readonly PostingRoleInput[];
  readonly rounds: readonly ScreeningRoundInput[];
  readonly applicationFields: readonly ApplicationFieldInput[];
  readonly applicationGuide: string;
};

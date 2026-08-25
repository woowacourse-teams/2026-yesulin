import type {
  Gender,
  MismatchReason,
  PostingPhase,
  ReviewStatus,
  RoleGender,
  RoundNumber,
} from "./types";

export const STATUS_LABELS = {
  PENDING: "미검토",
  PASS: "합격",
  FAIL: "불합격",
  ETC: "기타",
} as const satisfies Record<ReviewStatus, string>;

export const selectableStatuses = (): readonly ReviewStatus[] => ["PASS", "FAIL", "ETC"];

export const ROUND_LABELS = {
  1: "1차 서류",
  2: "2차 오디션",
  3: "3차 최종",
  4: "4차 전형",
  5: "5차 전형",
} as const satisfies Record<RoundNumber, string>;

export const PHASE_LABELS = {
  DRAFT: "작성 중",
  UPCOMING: "진행 예정",
  OPEN: "진행 중",
  RECRUIT_CLOSED: "접수 마감",
  FINISHED: "전형 종료",
} as const satisfies Record<PostingPhase, string>;

export const GENDER_LABELS = {
  MALE: "남",
  FEMALE: "여",
} as const satisfies Record<Gender, string>;

export const genderText = (gender: Gender | null) => gender === null ? "미수집" : GENDER_LABELS[gender];

export const ageText = (age: number | null) => age === null ? "나이 미수집" : `만 ${age}세`;

export const ROLE_GENDER_LABELS = {
  MALE: "남",
  FEMALE: "여",
  ANY: "무관",
} as const satisfies Record<RoleGender, string>;

export const MISMATCH_LABELS = {
  GENDER: "성별",
  AGE: "나이",
} as const satisfies Record<MismatchReason, string>;

export const mismatchText = (reasons: readonly MismatchReason[]) =>
  reasons.map((reason) => MISMATCH_LABELS[reason]).join("·");

/** 배지에는 ETC 사유를 우선 노출한다. 사유가 없을 때만 '기타'로 떨어진다. */
export const statusText = (status: ReviewStatus, memo: string) =>
  status === "ETC" && memo.trim() ? memo : STATUS_LABELS[status];

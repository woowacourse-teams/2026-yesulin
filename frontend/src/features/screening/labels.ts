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
  ABSENT: "불참",
  ETC: "기타",
} as const satisfies Record<ReviewStatus, string>;

/** 1차는 현장에 오지 않으므로 '불참'을 선택할 수 없다. */
export const selectableStatuses = (round: RoundNumber): readonly ReviewStatus[] =>
  round === 1 ? ["PASS", "FAIL", "ETC"] : ["PASS", "FAIL", "ABSENT", "ETC"];

export const ROUND_LABELS = {
  1: "1차 서류",
  2: "2차 오디션",
  3: "3차 최종",
} as const satisfies Record<RoundNumber, string>;

export const PHASE_LABELS = {
  OPEN: "진행중",
  UPCOMING: "예정",
  RECRUIT_CLOSED: "접수마감",
  FINISHED: "전형마감",
} as const satisfies Record<PostingPhase, string>;

export const GENDER_LABELS = {
  MALE: "남",
  FEMALE: "여",
} as const satisfies Record<Gender, string>;

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

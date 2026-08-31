import type {
  Applicant,
  Gender,
  MismatchReason,
  PostingPhase,
  ReviewStatus,
  RoleGender,
  RoleSummary,
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

export const roleConditionText = (role: Pick<RoleSummary, "gender" | "ageMin" | "ageMax">) =>
  `${roleGenderConditionText(role.gender)} · ${roleAgeText(role.ageMin, role.ageMax)}`;

export const mismatchDetailText = (
  applicant: Pick<Applicant, "gender" | "age" | "mismatchReasons">,
  role: Pick<RoleSummary, "gender" | "ageMin" | "ageMax">,
) => applicant.mismatchReasons.map((reason) => {
  if (reason === "GENDER") {
    return `성별: ${conditionGenderText(applicant.gender)} → ${roleGenderConditionText(role.gender)} 조건`;
  }
  return `나이: ${ageText(applicant.age)} → ${roleAgeText(role.ageMin, role.ageMax)}`;
});

function conditionGenderText(gender: Gender | null) {
  if (gender === null) return "미수집";
  return gender === "FEMALE" ? "여성" : "남성";
}

function roleGenderConditionText(gender: RoleGender) {
  return gender === "ANY" ? "성별 무관" : conditionGenderText(gender);
}

function roleAgeText(ageMin: number, ageMax: number) {
  return ageMin === ageMax ? `만 ${ageMin}세` : `만 ${ageMin}~${ageMax}세`;
}

/** 배지에는 ETC 사유를 우선 노출한다. 사유가 없을 때만 '기타'로 떨어진다. */
export const statusText = (status: ReviewStatus, memo: string) =>
  status === "ETC" && memo.trim() ? memo : STATUS_LABELS[status];

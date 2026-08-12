import type { ApplicationId, Review, RoleId, RoundNumber } from "@/features/auditions/types";
import { ROUND_NUMBERS } from "@/features/auditions/types";
import { APPLICANTS, type MockApplicant } from "./applicants";
import { CATALOG } from "./catalog";

type MutableReview = { status: Review["status"]; memo: string; note: string };

/** (지원서, 차수) → 심사 결과. 지원서에 상태를 직접 두면 다음 차수가 이전 기록을 덮는다. */
const reviews = new Map<string, MutableReview>();
/** 마감된 (배역, 차수). 전형은 배역 단위로 독립 진행된다. */
const closedRounds = new Set<string>();
const submittedApplicants: MockApplicant[] = [];

const reviewKey = (application: ApplicationId, round: RoundNumber) => `${application}:${round}`;
const roundKey = (role: RoleId, round: RoundNumber) => `${role}:${round}`;

export function reviewOf(application: ApplicationId, round: RoundNumber): MutableReview {
  const key = reviewKey(application, round);
  const existing = reviews.get(key);
  if (existing) return existing;

  const created: MutableReview = { status: "PENDING", memo: "", note: "" };
  reviews.set(key, created);
  return created;
}

export const readReview = (application: ApplicationId, round: RoundNumber): Review => ({
  ...reviewOf(application, round),
});

export const isRoundClosed = (role: RoleId, round: RoundNumber) => closedRounds.has(roundKey(role, round));

export const markRoundClosed = (role: RoleId, round: RoundNumber) => {
  closedRounds.add(roundKey(role, round));
};

export const allApplicants = (): readonly MockApplicant[] => [...APPLICANTS, ...submittedApplicants];

export const applicantsOfRole = (role: RoleId): readonly MockApplicant[] =>
  allApplicants().filter((applicant) => applicant.roleId === role);

/** 공개 제출 스냅샷을 같은 심사 지원서 풀에 추가한다. */
export function addScreeningApplicant(applicant: MockApplicant) {
  if (allApplicants().some((candidate) => candidate.id === applicant.id)) return;
  submittedApplicants.unshift(applicant);
}

/** 공고에서 설정한 전형 차수. 차수 설정이 없으면 3차 전형을 기본값으로 사용한다. */
export function roundNumbersForRole(role: RoleId): readonly RoundNumber[] {
  for (const performance of CATALOG) {
    const posting = performance.postings.find((candidate) =>
      candidate.roles.some((item) => item.id === role),
    );
    if (posting) return posting.rounds?.map((round) => round.round) ?? ROUND_NUMBERS;
  }
  return ROUND_NUMBERS;
}

/**
 * 해당 차수에 심사할 대상. 1차는 전원, 2차부터는 직전 차수를 마감했을 때만
 * 그 차수 합격자가 넘어온다. 마감 전에는 비어 있다.
 */
export function poolFor(role: RoleId, round: RoundNumber): readonly MockApplicant[] {
  if (round === 1) return applicantsOfRole(role);

  const previous = (round - 1) as RoundNumber;
  if (!isRoundClosed(role, previous)) return [];
  return applicantsOfRole(role).filter((applicant) => reviewOf(applicant.id, previous).status === "PASS");
}

/** 아직 마감되지 않은 가장 이른 차수. 전부 마감이면 마지막 차수를 반환한다. */
export function activeRound(role: RoleId): RoundNumber {
  const rounds = roundNumbersForRole(role);
  for (const round of rounds) {
    if (!isRoundClosed(role, round)) return round;
  }
  return rounds.at(-1) ?? 1;
}

export const allRoundsClosed = (role: RoleId) =>
  roundNumbersForRole(role).every((round) => isRoundClosed(role, round));

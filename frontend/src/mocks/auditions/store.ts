import type { SubmissionId, Review, RoleId, RoundNumber } from "@/features/auditions/types";
import { ROUND_NUMBERS } from "@/features/auditions/types";
import { APPLICANTS, SCREENING_STATE_SEEDS, type MockApplicant } from "./applicants";
import { CATALOG } from "./catalog";

type MutableReview = { status: Review["status"]; memo: string; note: string };

/** (지원서, 배역, 차수) → 심사 결과. 복수 배역의 결과가 서로 덮이지 않는다. */
const reviews = new Map<string, MutableReview>();
/** 마감된 (배역, 차수). 전형은 배역 단위로 독립 진행된다. */
const closedRounds = new Set<string>();
const submittedApplicants: MockApplicant[] = [];

const reviewKey = (submission: SubmissionId, role: RoleId, round: RoundNumber) => `${submission}:${role}:${round}`;
const roundKey = (role: RoleId, round: RoundNumber) => `${role}:${round}`;

for (const seed of SCREENING_STATE_SEEDS) {
  for (const round of seed.closedRounds) closedRounds.add(roundKey(seed.roleId, round));
  for (const review of seed.reviews) {
    reviews.set(reviewKey(review.submissionId, seed.roleId, review.round), {
      status: review.status,
      memo: "",
      note: review.note ?? "",
    });
  }
}

export function reviewOf(submission: SubmissionId, role: RoleId, round: RoundNumber): MutableReview {
  const key = reviewKey(submission, role, round);
  const existing = reviews.get(key);
  if (existing) return existing;

  const created: MutableReview = { status: "PENDING", memo: "", note: "" };
  reviews.set(key, created);
  return created;
}

export const readReview = (submission: SubmissionId, role: RoleId, round: RoundNumber): Review => ({
  ...reviewOf(submission, role, round),
});

export const isRoundClosed = (role: RoleId, round: RoundNumber) => closedRounds.has(roundKey(role, round));

export const markRoundClosed = (role: RoleId, round: RoundNumber) => {
  closedRounds.add(roundKey(role, round));
};

export const allApplicants = (): readonly MockApplicant[] => [...APPLICANTS, ...submittedApplicants];

export const applicantsOfRole = (role: RoleId): readonly MockApplicant[] =>
  allApplicants().filter((applicant) => applicant.roleIds.includes(role));

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

/** 해당 차수에 심사할 대상. 마감된 이전 차수에서 합격한 지원자만 다음 차수로 승격된다. */
export function poolFor(role: RoleId, round: RoundNumber): readonly MockApplicant[] {
  if (round === 1) return applicantsOfRole(role);

  return applicantsOfRole(role).filter((applicant) => {
    for (let previous = 1; previous < round; previous += 1) {
      const previousRound = previous as RoundNumber;
      if (!isRoundClosed(role, previousRound)
        || reviewOf(applicant.id, role, previousRound).status !== "PASS") return false;
    }
    return true;
  });
}

/** 아직 마감하지 않은 가장 이른 차수. */
export function activeRound(role: RoleId): RoundNumber {
  const rounds = roundNumbersForRole(role);
  for (const round of rounds) {
    if (!isRoundClosed(role, round)) return round;
  }
  return rounds.at(-1) ?? 1;
}

export const allRoundsClosed = (role: RoleId) =>
  roundNumbersForRole(role).every((round) => isRoundClosed(role, round));

export function completeRound(role: RoleId, round: RoundNumber) {
  if (isRoundClosed(role, round)) return completionResult(role, round, 0, 0);

  const counts = (() => {
    const applicants = poolFor(role, round);
    const pass = applicants.filter((applicant) => reviewOf(applicant.id, role, round).status === "PASS").length;
    const pending = applicants.filter((applicant) => reviewOf(applicant.id, role, round).status === "PENDING").length;
    return { pass, pending };
  })();
  markRoundClosed(role, round);

  const rounds = roundNumbersForRole(role);
  const currentIndex = rounds.indexOf(round);
  for (const nextRound of rounds.slice(currentIndex + 1)) {
    if (poolFor(role, nextRound).length > 0) break;
    markRoundClosed(role, nextRound);
  }
  return completionResult(role, round, counts.pass, counts.pending);
}

function completionResult(role: RoleId, round: RoundNumber, acceptedCount: number, unselectedCount: number) {
  const nextRound = roundNumbersForRole(role).find((candidate) => !isRoundClosed(role, candidate)) ?? null;
  return {
    round,
    acceptedCount,
    unselectedCount,
    promotedCount: nextRound === null ? 0 : acceptedCount,
    nextRound,
    allRoundsClosed: nextRound === null,
  };
}

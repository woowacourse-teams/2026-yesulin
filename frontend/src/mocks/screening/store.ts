import type { ApplicationId, Review, RoleId, RoundNumber } from "@/features/screening/types";
import { ROUND_NUMBERS } from "@/features/screening/types";
import { APPLICANTS, type MockApplicant } from "./applicants";
import { CATALOG } from "./catalog";

type MutableReview = { status: Review["status"]; memo: string; note: string };

/** (지원서, 차수) → 심사 결과. 지원서에 상태를 직접 두면 다음 차수가 이전 기록을 덮는다. */
const reviews = new Map<string, MutableReview>();
/** 마감된 (배역, 차수). 전형은 배역 단위로 독립 진행된다. */
const closedRounds = new Set<string>();

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

export const applicantsOfRole = (role: RoleId): readonly MockApplicant[] =>
  APPLICANTS.filter((applicant) => applicant.roleId === role);

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
  for (const round of ROUND_NUMBERS) {
    if (!isRoundClosed(role, round)) return round;
  }
  return 3;
}

export const allRoundsClosed = (role: RoleId) => ROUND_NUMBERS.every((round) => isRoundClosed(role, round));

/** 지난 시즌 공고는 전 차수 심사 이력이 채워진 상태로 시작한다. */
function seedFinishedPostings() {
  for (const performance of CATALOG) {
    for (const posting of performance.postings) {
      if (!posting.finished) continue;

      for (const role of posting.roles) {
        for (const round of ROUND_NUMBERS) {
          const pool = poolFor(role.id, round);
          if (pool.length > 0) {
            const keep = round === 3 ? role.quota : Math.max(role.quota, Math.ceil(pool.length / 2));
            pool.forEach((applicant, index) => {
              reviewOf(applicant.id, round).status = index < keep ? "PASS" : "FAIL";
            });
          }
          markRoundClosed(role.id, round);
        }
      }
    }
  }
}

seedFinishedPostings();

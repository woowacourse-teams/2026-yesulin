import type {
  PerformanceId,
  PostingId,
  PostingPhase,
  ReviewCounts,
  ReviewProgress,
  RoleId,
  RoundNumber,
  RoundState,
} from "@/features/auditions/types";
import type { CatalogPerformance, CatalogPosting, CatalogRole } from "./catalog";
import { CATALOG, ROUND_NAMES } from "./catalog";
import { activeRound, isRoundClosed, poolFor, reviewOf, roundNumbersForRole } from "./store";

export const findPerformance = (id: PerformanceId): CatalogPerformance | undefined =>
  CATALOG.find((performance) => performance.id === id);

export function findPosting(id: PostingId): CatalogPosting | undefined {
  for (const performance of CATALOG) {
    const posting = performance.postings.find((candidate) => candidate.id === id);
    if (posting) return posting;
  }
  return undefined;
}

export function findRole(id: RoleId): { role: CatalogRole; posting: CatalogPosting } | undefined {
  for (const performance of CATALOG) {
    for (const posting of performance.postings) {
      const role = posting.roles.find((candidate) => candidate.id === id);
      if (role) return { role, posting };
    }
  }
  return undefined;
}

export function countsFor(role: RoleId, round: RoundNumber): ReviewCounts {
  const pool = poolFor(role, round);
  let pass = 0;
  let fail = 0;
  let etc = 0;
  let pending = 0;

  for (const applicant of pool) {
    const { status } = reviewOf(applicant.id, role, round);
    if (status === "PASS") pass += 1;
    else if (status === "FAIL") fail += 1;
    else if (status === "ETC") etc += 1;
    else pending += 1;
  }

  return { all: pool.length, pending, done: pool.length - pending, pass, fail, etc };
}

export const progressOf = (counts: ReviewCounts): ReviewProgress => ({
  done: counts.done,
  total: counts.all,
  percent: counts.all > 0 ? Math.round((counts.done / counts.all) * 100) : 0,
});

export function roundStatesOf(role: RoleId): readonly RoundState[] {
  const found = findRole(role);
  const configured = found?.posting.rounds;
  return roundNumbersForRole(role).map((round) => {
    const counts = countsFor(role, round);
    return {
      round,
      name: configured?.find((item) => item.round === round)?.name || ROUND_NAMES[round],
      counts,
      progress: progressOf(counts),
    };
  });
}

/** 배역별 현재 차수의 검토 대상·완료를 합산해 공고 전체 진행률을 낸다. */
export function postingProgress(posting: CatalogPosting): ReviewProgress {
  let done = 0;
  let total = 0;

  for (const role of posting.roles) {
    const counts = countsFor(role.id, activeRound(role.id));
    done += counts.done;
    total += counts.all;
  }

  return { done, total, percent: total > 0 ? Math.round((done / total) * 100) : 0 };
}

export const pendingCountOf = (posting: CatalogPosting) =>
  posting.roles.reduce((sum, role) => sum + countsFor(role.id, activeRound(role.id)).pending, 0);

export const postingAllRoundsClosed = (posting: CatalogPosting) =>
  posting.roles.length > 0 &&
  posting.roles.every((role) => roundNumbersForRole(role.id).every((round) => isRoundClosed(role.id, round)));

/**
 * 작성·접수 상태(DRAFT/OPEN/UPCOMING/CLOSED)와 전 배역 마감 여부를 합쳐 5단계로 파생한다.
 * 접수 마감과 전형 마감은 다른 상태다 — 접수는 끝났지만 심사가 안 끝났을 수 있다.
 */
export function postingPhase(posting: CatalogPosting): PostingPhase {
  if (posting.status === "DRAFT") return "DRAFT";
  if (posting.status === "UPCOMING") return "UPCOMING";
  if (posting.status === "OPEN") return "OPEN";
  return postingAllRoundsClosed(posting) ? "FINISHED" : "RECRUIT_CLOSED";
}

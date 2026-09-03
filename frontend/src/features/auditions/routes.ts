import type { SubmissionId, PerformanceId, PostingId, RoleId, RoundNumber } from "./types";
import { NUMERIC_FIELDS, type AuditionListRouteState } from "./filters";

function screeningQuery(round?: RoundNumber, state?: AuditionListRouteState) {
  const searchParams = new URLSearchParams();
  if (round) searchParams.set("round", String(round));
  if (state) {
    searchParams.set("work", state.work);
    searchParams.set("status", state.status);
    searchParams.set("view", state.view);
    if (state.query.trim()) searchParams.set("q", state.query.trim());
    if (state.genders.size > 0) searchParams.set("genders", [...state.genders].sort().join(","));
    for (const field of NUMERIC_FIELDS) {
      const condition = state.numeric[field];
      if (condition) searchParams.set(field, `${condition.op}:${condition.value}`);
    }
    if (state.mismatchOnly) searchParams.set("mismatch", "1");
  }
  return searchParams.size > 0 ? `?${searchParams.toString()}` : "";
}

/**
 * 화면 경로. 공연/공고/배역 식별자가 전역 유일하므로 계층을 그대로 중첩하지 않고
 * 평평하게 둔다. 상위 정보는 각 응답이 함께 내려줘 브레드크럼으로 복원한다.
 */
export const auditionRoutes = {
  performances: "/producers/performances",
  account: "/producers/account",
  performance: (id: PerformanceId) => `/producers/performances/${id}`,
  posting: (id: PostingId) => `/producers/postings/${id}`,
  role: (id: RoleId, round?: RoundNumber, state?: AuditionListRouteState) =>
    `/producers/roles/${id}${screeningQuery(round, state)}`,
  applicantReview: (
    role: RoleId,
    submission: SubmissionId,
    round: RoundNumber,
    state?: AuditionListRouteState,
  ) => `/producers/roles/${role}/submissions/${submission}${screeningQuery(round, state)}`,
} as const;

/** 외부 오디션 공고에서 배우가 진입할 공개 지원서 경로. */
export const publicApplicationRoute = (postingId: PostingId) => `/apply/${postingId}`;

/** 관리자 지원자 관리는 배역 수와 관계없이 공고의 배역별 현황에서 시작한다. */
export const postingEntryHref = (posting: { readonly id: PostingId }) => auditionRoutes.posting(posting.id);

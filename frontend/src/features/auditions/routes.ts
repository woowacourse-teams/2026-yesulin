import type { ApplicationId, PerformanceId, PostingId, RoleId, RoundNumber } from "./types";

/**
 * 화면 경로. 공연/공고/배역 식별자가 전역 유일하므로 계층을 그대로 중첩하지 않고
 * 평평하게 둔다. 상위 정보는 각 응답이 함께 내려줘 브레드크럼으로 복원한다.
 */
export const auditionRoutes = {
  performances: "/producers/performances",
  account: "/producers/account",
  performance: (id: PerformanceId) => `/producers/performances/${id}`,
  posting: (id: PostingId) => `/producers/postings/${id}`,
  role: (id: RoleId, round?: RoundNumber) =>
    round ? `/producers/roles/${id}?round=${round}` : `/producers/roles/${id}`,
  applicantReview: (role: RoleId, application: ApplicationId, round: RoundNumber) =>
    `/producers/roles/${role}/applications/${application}?round=${round}`,
} as const;

/** 외부 오디션 공고에서 배우가 진입할 공개 지원서 경로. */
export const publicApplicationRoute = (postingId: PostingId) => `/apply/${postingId}`;

/** 관리자 지원자 관리는 배역 수와 관계없이 공고의 배역별 현황에서 시작한다. */
export const postingEntryHref = (posting: { readonly id: PostingId }) => auditionRoutes.posting(posting.id);

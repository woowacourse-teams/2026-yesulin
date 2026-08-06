import type { PerformanceId, PostingId, RoleId } from "./types";

/**
 * 화면 경로. 공연/공고/배역 식별자가 전역 유일하므로 계층을 그대로 중첩하지 않고
 * 평평하게 둔다. 상위 정보는 각 응답이 함께 내려줘 브레드크럼으로 복원한다.
 */
export const auditionRoutes = {
  performances: "/producers/performances",
  performance: (id: PerformanceId) => `/producers/performances/${id}`,
  posting: (id: PostingId) => `/producers/postings/${id}`,
  role: (id: RoleId) => `/producers/roles/${id}`,
} as const;

/** 외부 오디션 공고에서 지원자가 진입할 공개 지원서 경로. */
export const publicApplicationRoute = (postingId: PostingId) => `/apply/${postingId}`;

/**
 * 공고를 열었을 때 갈 곳. 배역 구분이 없거나 배역이 하나뿐이면 배역 선택 화면을
 * 건너뛰고 바로 심사 화면으로 들어간다.
 */
export const postingEntryHref = (posting: {
  readonly id: PostingId;
  readonly soleRoleId: RoleId | null;
}) => (posting.soleRoleId ? auditionRoutes.role(posting.soleRoleId) : auditionRoutes.posting(posting.id));

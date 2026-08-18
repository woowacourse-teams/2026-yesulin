import type { PerformanceRoleTemplate } from "./creation-types";

/**
 * 배우 심사 도메인 모델.
 *
 *   Performance 공연
 *     └ Posting     공고 — 실제 게시하는 모집 공고 한 건
 *         └ Role         배역 — 한 공고 안에 여러 개
 *             └ Application  지원서
 *
 * 전형은 배역 단위로 독립 진행된다. 차수 마감(Round)도 배역별로 따로 관리한다.
 * 심사 결과(Review)는 (지원서, 배역, 차수)에 붙는다. 복수 배역과 다음 차수의
 * 결과가 서로 덮이지 않도록 각 심사 단위를 독립적으로 식별한다.
 */

declare const brand: unique symbol;
type Brand<T, B extends string> = T & { readonly [brand]: B };

export type PerformanceId = Brand<string, "PerformanceId">;
export type PostingId = Brand<string, "PostingId">;
export type RoleId = Brand<string, "RoleId">;
/** Notion의 공개 제출·내 지원서 계약(Long)에 맞춘 전 영역 공통 지원서 식별자. */
export type ApplicationId = Brand<number, "ApplicationId">;

export const performanceId = (value: string) => value as PerformanceId;
export const postingId = (value: string) => value as PostingId;
export const roleId = (value: string) => value as RoleId;
export const applicationId = (value: number) => value as ApplicationId;

export const ROUND_NUMBERS = [1, 2, 3, 4, 5] as const;
export type RoundNumber = (typeof ROUND_NUMBERS)[number];

export const REVIEW_STATUSES = ["PENDING", "PASS", "FAIL", "ABSENT", "ETC"] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/** 공고의 작성·모집·전형 진행 단계. 접수 마감과 전형 종료는 다른 상태다. */
export const POSTING_PHASES = ["DRAFT", "UPCOMING", "OPEN", "RECRUIT_CLOSED", "FINISHED"] as const;
export type PostingPhase = (typeof POSTING_PHASES)[number];

export type Gender = "MALE" | "FEMALE";
/** 배역이 요구하는 성별. ANY는 성별 무관. */
export type RoleGender = Gender | "ANY";

/** 배역이 명시한 조건을 벗어난 배우를 표시하기 위한 사유. */
export const MISMATCH_REASONS = ["GENDER", "AGE"] as const;
export type MismatchReason = (typeof MISMATCH_REASONS)[number];

export type ReviewCounts = {
  readonly all: number;
  readonly pending: number;
  readonly done: number;
  readonly pass: number;
  readonly fail: number;
  readonly absent: number;
  readonly etc: number;
};

export type ReviewProgress = {
  readonly done: number;
  readonly total: number;
  readonly percent: number;
};

export type Review = {
  readonly status: ReviewStatus;
  /** ETC 상태의 사유. 목록·배지에 상태 라벨 대신 표시된다. */
  readonly memo: string;
  /** 내부 메모. 배우에게 공개되지 않는다. */
  readonly note: string;
};

export type PerformanceSummary = {
  readonly id: PerformanceId;
  readonly posterUrl: string;
  readonly title: string;
  readonly venue: string;
  readonly venueAddress: import("./creation-types").VenueAddress;
  readonly postingCount: number;
  readonly openPostingCount: number;
  readonly applicantCount: number;
  readonly pendingReviewCount: number;
  readonly postings: readonly PostingSummary[];
};

export type PostingSummary = {
  readonly id: PostingId;
  readonly performanceId: PerformanceId;
  readonly title: string;
  readonly deadline: string;
  readonly phase: PostingPhase;
  /** 배역 구분 없이 한 덩어리로 접수하는 공고인지 여부. */
  readonly isOpenCall: boolean;
  readonly roleCount: number;
  readonly quotaTotal: number;
  readonly applicantCount: number;
  readonly pendingReviewCount: number;
  readonly allRoundsClosed: boolean;
  readonly progress: ReviewProgress;
  readonly previewPhotoUrls: readonly string[];
  /** 배역 선택 화면을 건너뛰고 바로 들어갈 배역. 배역이 여럿이면 null. */
  readonly soleRoleId: RoleId | null;
};

export type RoleSummary = {
  readonly id: RoleId;
  readonly postingId: PostingId;
  readonly name: string;
  readonly description: string;
  readonly quota: number;
  readonly gender: RoleGender;
  readonly ageMin: number;
  readonly ageMax: number;
  readonly applicantCount: number;
  /** 아직 마감되지 않은 가장 이른 차수. 전부 마감이면 마지막 차수. */
  readonly activeRound: RoundNumber;
  readonly allRoundsClosed: boolean;
  readonly progress: ReviewProgress;
  readonly counts: ReviewCounts;
};

export type ApplicantPhoto = {
  readonly label: string;
  readonly url: string;
  /** 원본 URL을 못 불러올 때 쓸 인라인 SVG data URL. */
  readonly fallbackUrl: string;
};

export type CareerEntry = {
  readonly year: number;
  readonly title: string;
  readonly part: string;
};

export type Applicant = {
  readonly id: ApplicationId;
  readonly name: string;
  readonly gender: Gender;
  readonly age: number;
  readonly height: number;
  readonly weight: number;
  readonly roleId: RoleId;
  readonly roleName: string;
  readonly birth: string;
  readonly phone: string;
  readonly email: string;
  readonly school: string;
  readonly submittedAt: string;
  readonly career: readonly CareerEntry[];
  readonly coverLetter: string;
  readonly motivation: string;
  readonly photos: readonly ApplicantPhoto[];
  readonly videoUrl: string | null;
  /** 조회한 차수의 심사 결과. */
  readonly review: Review;
  /** 차수별 심사 기록. 아직 대상이 아니었던 차수는 null. */
  readonly reviewHistory: Readonly<Record<RoundNumber, Review | null>>;
  readonly mismatchReasons: readonly MismatchReason[];
};

export type RoundState = {
  readonly round: RoundNumber;
  readonly name: string;
  /** 이전 차수가 마감돼 이 차수를 열람할 수 있는지 여부. */
  readonly open: boolean;
  readonly closed: boolean;
  readonly counts: ReviewCounts;
  readonly progress: ReviewProgress;
};

export type PerformanceRef = {
  readonly id: PerformanceId;
  readonly posterUrl: string;
  readonly title: string;
};

export type PostingRef = {
  readonly id: PostingId;
  readonly title: string;
  readonly isOpenCall: boolean;
};

/** 사이드바 트리 한 벌. 공연 → 공고까지만 담는다. */
export type AuditionTree = {
  readonly performances: readonly AuditionTreeNode[];
};

export type AuditionTreeNode = {
  readonly id: PerformanceId;
  readonly posterUrl: string;
  readonly title: string;
  readonly postings: readonly AuditionTreePosting[];
};

export type AuditionTreePosting = {
  readonly id: PostingId;
  readonly title: string;
  readonly phase: PostingPhase;
  readonly applicantCount: number;
  /** 현재 경로가 어느 공고 아래인지 되짚기 위해 배역 식별자를 함께 내려준다. */
  readonly roleIds: readonly RoleId[];
  readonly soleRoleId: RoleId | null;
};

export type PerformanceListResponse = {
  readonly performances: readonly PerformanceSummary[];
};

export type PostingListResponse = {
  readonly performance: PerformanceRef;
  readonly roleTemplates: readonly PerformanceRoleTemplate[];
  readonly postings: readonly PostingSummary[];
};

export type CreatePostingResponse = PostingListResponse & {
  /** 외부 공고에 붙일 공개 지원서 URL을 만들기 위한 새 공고 식별자. */
  readonly createdPostingId: PostingId;
};

export type RoleListResponse = {
  readonly performance: PerformanceRef;
  readonly posting: PostingSummary;
  readonly roles: readonly RoleSummary[];
};

/** 배우 심사 화면 한 벌. 차수별 pool 전체를 내려주고 필터는 클라이언트가 건다. */
export type AuditionBoardResponse = {
  readonly performance: PerformanceRef;
  readonly posting: PostingRef;
  readonly role: RoleSummary;
  readonly round: RoundNumber;
  readonly rounds: readonly RoundState[];
  readonly applicants: readonly Applicant[];
};

export type SaveReviewRequest = {
  readonly roleId: RoleId;
  readonly round: RoundNumber;
  readonly applicationIds: readonly ApplicationId[];
  readonly status?: ReviewStatus;
  readonly memo?: string;
  readonly note?: string;
};

export type CloseRoundRequest = {
  readonly roleId: RoleId;
  readonly round: RoundNumber;
};

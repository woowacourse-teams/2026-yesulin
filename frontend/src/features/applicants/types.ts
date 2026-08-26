import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import type { SubmissionId } from "@/features/auditions/types";

export type CareerEntry = {
  readonly year: number;
  readonly title: string;
  readonly part: string;
};

export type BodyMeasurements = {
  readonly height: number;
  readonly weight: number;
};

export type ApplicantAnswerValue =
  | string
  | number
  | BodyMeasurements
  | readonly string[]
  | readonly CareerEntry[];

export type ApplicantAnswer = {
  readonly key: string;
  readonly label: string;
  readonly value: ApplicantAnswerValue;
  readonly previewUrls?: readonly string[];
  readonly custom?: boolean;
  readonly lastUsedPostingTitle?: string;
  readonly updatedAt?: string;
};

export type ApplicantProfilePhoto = {
  readonly id: string;
  readonly name: string;
  readonly url: string;
  readonly representative: boolean;
  /** 보관함 사진이 가리키는 업로드 파일. 지원서에서 재업로드 없이 그대로 제출한다. */
  readonly fileId?: number;
};

export type ApplicantProfileVideo = {
  readonly id: string;
  readonly url: string;
  readonly youtubeId: string;
};

export type ApplicantProfileResponse = {
  readonly answers: readonly ApplicantAnswer[];
  readonly photoLibrary: readonly ApplicantProfilePhoto[];
  readonly videoLibrary: readonly ApplicantProfileVideo[];
  readonly completeness: {
    readonly filled: number;
    readonly standardTotal: number;
  };
};

export type UpdateProfileRequest = {
  readonly answers?: readonly {
    readonly key: string;
    readonly value: ApplicantAnswerValue;
    readonly label?: string;
  }[];
  readonly removeKeys?: readonly string[];
  readonly photoLibrary?: readonly ApplicantProfilePhoto[];
  readonly videoLibrary?: readonly ApplicantProfileVideo[];
};

export type ApplicantSubmissionSummary = {
  readonly id: SubmissionId;
  readonly postingId: string;
  readonly performanceTitle: string;
  readonly postingTitle: string;
  readonly posterUrl: string;
  readonly companyName: string;
  readonly submittedAt: string;
  readonly selectedRoles: readonly ApplicantSelectedRole[];
};

export type ApplicantSelectedRole = {
  readonly roleId: string;
  readonly roleName: string;
};

export type ApplicantApplicationDraftSummary = {
  readonly postingId: string;
  readonly performanceTitle: string;
  readonly postingTitle: string;
  readonly posterUrl: string;
  readonly companyName: string;
  readonly roleNames: readonly string[];
  readonly updatedAt: number;
  readonly postingStatus: "OPEN" | "UPCOMING" | "CLOSED";
};

export type ApplicantSubmissionListResponse = {
  readonly submissions: readonly ApplicantSubmissionSummary[];
};

export type ApplicantSubmissionDetail = ApplicantSubmissionSummary & {
  readonly answers: readonly ApplicantAnswer[];
  readonly applicationFields: readonly ApplicationFieldInput[];
};

export type RecommendedPosting = {
  readonly id: string;
  readonly performanceTitle: string;
  readonly title: string;
  readonly companyName: string;
  readonly status: "OPEN" | "UPCOMING" | "CLOSED";
  readonly recruitmentStart: string;
  readonly recruitmentEnd: string;
};

export type RecommendedPostingResponse = {
  readonly postings: readonly RecommendedPosting[];
};

export type LookupSubmissionRequest = {
  readonly code: string;
  readonly phone: string;
};

export type LookupSubmissionResponse = {
  readonly lookupCode: string;
  readonly performanceTitle: string;
  readonly postingTitle: string;
  readonly companyName: string;
  readonly roleName: string;
  readonly submittedAt: string;
  readonly postingStatus: "OPEN" | "UPCOMING" | "CLOSED";
  readonly editable: boolean;
  readonly editableUntil: string;
  readonly answers: readonly ApplicantAnswer[];
};

export type ProfilePrefillResponse = {
  readonly answers: readonly ApplicantAnswer[];
  readonly filledCount: number;
  readonly requiredCount: number;
  readonly missingKeys: readonly string[];
};

export type CreateSubmissionRequest = {
  /** 공개 제출 경로에는 공고 식별자 자리가 없어 본문으로 전달한다. */
  readonly postingId: string;
  readonly roleIds: readonly string[];
  readonly answers: readonly {
    readonly key: string;
    readonly label?: string;
    readonly value: ApplicantAnswerValue;
  }[];
  readonly privacyAgreed: boolean;
  readonly saveToProfile: boolean;
};

export type CreateSubmissionResponse = {
  readonly submissionId: SubmissionId;
  readonly receiptNumber: string;
  readonly submittedAt: string;
  readonly profileClaimToken: string | null;
  readonly profileClaimExpiresAt: string | null;
};

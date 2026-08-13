import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import type { ApplicationId } from "@/features/auditions/types";

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

export type ApplicantProfileResponse = {
  readonly answers: readonly ApplicantAnswer[];
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
};

export type ApplicantApplicationSummary = {
  readonly id: ApplicationId;
  readonly postingId: string;
  readonly performanceTitle: string;
  readonly postingTitle: string;
  readonly posterUrl: string;
  readonly companyName: string;
  readonly roleName: string;
  readonly lookupCode: string;
  readonly submittedAt: string;
  readonly editable: boolean;
  readonly recruitmentEnd: string;
};

export type ApplicantApplicationListResponse = {
  readonly applications: readonly ApplicantApplicationSummary[];
};

export type ApplicantApplicationDetail = ApplicantApplicationSummary & {
  readonly roleId: string;
  readonly updatedAt: string;
  readonly editableUntil: string;
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

export type ProfilePrefillResponse = {
  readonly answers: readonly ApplicantAnswer[];
  readonly filledCount: number;
  readonly requiredCount: number;
  readonly missingKeys: readonly string[];
};

export type SubmitApplicationRequest = {
  readonly postingId: string;
  readonly roleIds: readonly string[];
  readonly answers: readonly {
    readonly key: string;
    readonly label?: string;
    readonly value: ApplicantAnswerValue;
  }[];
  readonly collectionAndUseAgreed: boolean;
  readonly thirdPartyProvisionAgreed: boolean;
};

export type SubmitApplicationResponse = {
  readonly applicationId: ApplicationId;
  readonly receiptNumber: string;
  readonly submittedAt: string;
  readonly profileClaimToken: string | null;
  readonly profileClaimExpiresAt: string | null;
};

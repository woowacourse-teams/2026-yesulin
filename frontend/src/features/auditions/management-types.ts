import type { ApplicationFieldInput, AuditionRoundInput, PerformanceRoleTemplate, PostingRoleInput, VenueAddress } from "./creation-types";
import type { PerformanceId, PostingId, PostingPhase } from "./types";

export type UpdatePerformanceRequest = {
  readonly posterFileId: number | null;
  readonly title: string;
  readonly venue: string;
  readonly venueAddress: VenueAddress;
  readonly posterUrl?: string;
  readonly roles: readonly Omit<PerformanceRoleTemplate, "id">[];
};

export type PerformanceManagementDetail = {
  readonly id: PerformanceId;
  readonly posterFileId: number | null;
  readonly posterUrl: string;
  readonly title: string;
  readonly venue: string;
  readonly venueAddress: VenueAddress;
  readonly roleTemplates: readonly PerformanceRoleTemplate[];
};

export type PostingManagementDetail = {
  readonly id: PostingId;
  readonly performanceId: PerformanceId;
  readonly performanceTitle: string;
  readonly posterUrl: string;
  readonly detailImageUrl: string;
  readonly title: string;
  readonly isOpenCall: boolean;
  readonly allowsMultipleRoles: boolean;
  readonly recruitmentStart: string;
  readonly recruitmentEnd: string;
  readonly performanceStart: string;
  readonly performanceEnd: string;
  readonly phase: PostingPhase;
  readonly applicantCount: number;
  readonly roleTemplates: readonly PerformanceRoleTemplate[];
  readonly roles: readonly PostingRoleInput[];
  readonly rounds: readonly AuditionRoundInput[];
  readonly lockedRounds: readonly number[];
  readonly applicationFields: readonly ApplicationFieldInput[];
  readonly applicationGuide: string;
  readonly rehearsalVenue: string;
  readonly rehearsalVenueAddress: VenueAddress;
};

export type UpdatePostingRequest = Partial<Pick<
  PostingManagementDetail,
  "title" | "recruitmentStart" | "recruitmentEnd" | "performanceStart" | "performanceEnd" | "rounds"
>>;

export type ProducerProfile = {
  readonly companyName: string;
  readonly contactName: string;
  readonly contactRole: string;
  readonly description: string;
  readonly email: string;
  readonly phone: string;
  readonly verificationStatus: "PENDING" | "ACTIVE";
};

export type UpdateProducerProfileRequest = Partial<Pick<
  ProducerProfile,
  "companyName" | "contactName" | "contactRole" | "description"
>>;

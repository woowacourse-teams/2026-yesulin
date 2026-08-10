import type { ApplicationFieldInput, AuditionRoundInput, PerformanceRoleTemplate, PostingRoleInput } from "./creation-types";
import type { PerformanceId, PostingId, PostingPhase } from "./types";

export type UpdatePerformanceRequest = {
  readonly title?: string;
  readonly venue?: string;
  readonly posterFileId?: string;
  readonly roleTemplates?: readonly (Omit<PerformanceRoleTemplate, "id"> & { readonly id?: string })[];
};

export type PostingManagementDetail = {
  readonly id: PostingId;
  readonly performanceId: PerformanceId;
  readonly performanceTitle: string;
  readonly title: string;
  readonly isOpenCall: boolean;
  readonly recruitmentStart: string;
  readonly recruitmentEnd: string;
  readonly phase: PostingPhase;
  readonly applicantCount: number;
  readonly roleTemplates: readonly PerformanceRoleTemplate[];
  readonly roles: readonly PostingRoleInput[];
  readonly rounds: readonly AuditionRoundInput[];
  readonly applicationFields: readonly ApplicationFieldInput[];
  readonly applicationGuide: string;
};

export type UpdatePostingRequest = Partial<Pick<
  PostingManagementDetail,
  "title" | "isOpenCall" | "recruitmentStart" | "recruitmentEnd" | "roles" | "rounds" | "applicationFields" | "applicationGuide"
>>;

export type ProducerProfile = {
  readonly companyName: string;
  readonly contactName: string;
  readonly contactRole: string;
  readonly logoUrl: string;
  readonly description: string;
  readonly email: string;
  readonly businessNumber: string;
  readonly representativeName: string;
  readonly verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
  readonly verifiedAt: string | null;
};

export type UpdateProducerProfileRequest = Partial<Pick<
  ProducerProfile,
  "companyName" | "contactName" | "contactRole" | "description"
>> & { readonly logoFileId?: string };

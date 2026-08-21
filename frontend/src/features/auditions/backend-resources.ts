import type { CreatePerformanceRequest } from "./creation-types";
import type { PerformanceListResponse } from "./types";

export type PerformanceResource = {
  readonly id: number | string;
  readonly posterFileId: number;
  readonly posterUrl: string;
  readonly title: string;
  readonly roadAddress: string;
  readonly createdAt: string;
  readonly roles: readonly {
    readonly id: number | string;
    readonly name: string;
    readonly description: string;
  }[];
  readonly venue?: string;
  readonly venueAddress?: CreatePerformanceRequest["venueAddress"];
  readonly postingCount?: number;
  readonly openPostingCount?: number;
  readonly applicantCount?: number;
  readonly pendingReviewCount?: number;
  readonly postings?: PerformanceListResponse["performances"][number]["postings"];
};

export type PerformanceResourceList = { readonly performances: readonly PerformanceResource[] };

export type FileUploadResource = {
  readonly fileId: number;
  readonly uploadUrl: string;
  readonly method: string;
  readonly expiresAt: string;
  readonly headers: Readonly<Record<string, string>>;
};

export type AuditionResource = {
  readonly id: string;
  readonly performanceId: number;
  readonly title: string;
  readonly performanceStartDate: string;
  readonly performanceEndDate: string | null;
  readonly openRun: boolean;
  readonly status: "DRAFT" | "PUBLISHED" | "CLOSED";
  readonly createdAt: string;
  readonly publishedAt: string | null;
};

export type AuditionRoleResource = {
  readonly id: number;
  readonly performanceRoleId: number;
  readonly name: string;
  readonly description: string;
  readonly recruitmentCount: number;
  readonly gender: "MALE" | "FEMALE" | "ANY";
  readonly minimumAge: number;
  readonly maximumAge: number;
};

export type AuditionRolesResource = {
  readonly auditionId: string;
  readonly multipleRoleApplicationsAllowed: boolean;
  readonly roles: readonly AuditionRoleResource[];
};

export type AuditionScheduleResource = {
  readonly auditionId: string;
  readonly recruitmentStartAt: string;
  readonly recruitmentEndAt: string;
  readonly stages: readonly {
    readonly id: number;
    readonly order: number;
    readonly name: string;
    readonly date: string;
    readonly notice: string;
  }[];
};

export type AuditionFormResource = {
  readonly auditionId: string;
  readonly basicFields: readonly string[];
  readonly additionalFields: readonly string[];
  readonly photoRequirements: readonly {
    readonly id: number;
    readonly order: number;
    readonly description: string;
    readonly count: number;
  }[];
  readonly videoRequirements: readonly {
    readonly id: number;
    readonly order: number;
    readonly description: string;
  }[];
  readonly additionalQuestions: readonly {
    readonly id: number;
    readonly order: number;
    readonly question: string;
    readonly required: boolean;
    readonly answerMaxLength: number;
  }[];
};

export type PublicAuditionResource = {
  readonly id: string;
  readonly performanceTitle: string;
  readonly title: string;
  readonly posterUrl: string;
  readonly roadAddress: string;
  readonly performanceStartDate: string;
  readonly performanceEndDate: string | null;
  readonly recruitmentStartAt: string;
  readonly recruitmentEndAt: string;
  readonly multipleRoleApplicationsAllowed: boolean;
  readonly roles: AuditionRolesResource["roles"];
  readonly stages: AuditionScheduleResource["stages"];
  readonly applicationForm: AuditionFormResource;
};

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
  readonly performanceId: string;
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

export type ScreeningReviewResource = {
  readonly status: "PENDING" | "PASS" | "FAIL" | "ABSENT" | "ETC";
  readonly memo: string;
  readonly note: string;
};

export type ScreeningSubmissionResource = {
  readonly id: string;
  readonly name: string;
  readonly gender: "MALE" | "FEMALE";
  readonly age: number;
  readonly height: number | null;
  readonly weight: number | null;
  readonly roleId: number;
  readonly roleName: string;
  readonly birth: string;
  readonly phone: string;
  readonly email: string;
  readonly school: string;
  readonly submittedAt: string;
  readonly career: readonly { readonly year: number; readonly title: string; readonly part: string }[];
  readonly coverLetter: string;
  readonly motivation: string;
  readonly photos: readonly { readonly label: string; readonly url: string }[];
  readonly videos: readonly { readonly label: string; readonly url: string }[];
  readonly review: ScreeningReviewResource;
  readonly reviewHistory: Readonly<Record<string, ScreeningReviewResource | null>>;
  readonly mismatchReasons: readonly ("GENDER" | "AGE")[];
};

export type ScreeningBoardResource = {
  readonly performance: { readonly id: number; readonly posterUrl: string; readonly title: string };
  readonly posting: { readonly id: string; readonly title: string; readonly openCall: boolean };
  readonly role: {
    readonly id: number;
    readonly postingId: string;
    readonly name: string;
    readonly description: string;
    readonly quota: number;
    readonly gender: "MALE" | "FEMALE" | "ANY";
    readonly ageMin: number;
    readonly ageMax: number;
    readonly applicantCount: number;
    readonly activeRound: number;
    readonly allRoundsClosed: boolean;
    readonly progress: { readonly done: number; readonly total: number; readonly percent: number };
    readonly counts: {
      readonly all: number;
      readonly pending: number;
      readonly done: number;
      readonly pass: number;
      readonly fail: number;
      readonly absent: number;
      readonly etc: number;
    };
  };
  readonly round: number;
  readonly rounds: readonly {
    readonly round: number;
    readonly name: string;
    readonly open: boolean;
    readonly closed: boolean;
    readonly counts: ScreeningBoardResource["role"]["counts"];
    readonly progress: ScreeningBoardResource["role"]["progress"];
  }[];
  readonly submissions: readonly ScreeningSubmissionResource[];
};

export type ScreeningSubmissionDetailResource = Omit<ScreeningBoardResource, "submissions"> & {
  readonly submission: ScreeningSubmissionResource;
};

import type {
  ApplicationFieldInput,
  PerformanceRoleTemplate,
  AuditionRoundInput,
  VenueAddress,
} from "@/features/auditions/creation-types";
import type { PerformanceId, PostingId, RoleGender, RoleId } from "@/features/auditions/types";

/** 인메모리 저장소가 사용하는 배역 원본. */
export type CatalogRole = {
  readonly id: RoleId;
  readonly name: string;
  readonly description: string;
  readonly quota: number;
  readonly gender: RoleGender;
  readonly ageMin: number;
  readonly ageMax: number;
  readonly applicantCount: number;
};

export type CatalogPosting = {
  readonly id: PostingId;
  readonly performanceId: PerformanceId;
  readonly title: string;
  readonly posterUrl: string;
  readonly detailImageUrl?: string;
  readonly performanceStart: string;
  readonly performanceEnd: string;
  readonly deadline: string;
  readonly status: "DRAFT" | "OPEN" | "CLOSED" | "UPCOMING";
  readonly isOpenCall: boolean;
  readonly allowsMultipleRoles: boolean;
  /** 지난 공고. 전 차수 심사 이력이 채워진 상태로 시작한다. */
  readonly finished: boolean;
  readonly roles: readonly CatalogRole[];
  readonly recruitmentStart?: string;
  readonly recruitmentEnd?: string;
  readonly rounds?: readonly AuditionRoundInput[];
  readonly applicationFields?: readonly ApplicationFieldInput[];
  readonly applicationGuide?: string;
  readonly rehearsalVenue?: string;
  readonly rehearsalVenueAddress?: VenueAddress;
};

export type CatalogPerformance = {
  readonly id: PerformanceId;
  readonly posterUrl: string;
  readonly title: string;
  readonly venue: string;
  readonly venueAddress: VenueAddress;
  readonly roleTemplates: readonly PerformanceRoleTemplate[];
  readonly postings: CatalogPosting[];
};

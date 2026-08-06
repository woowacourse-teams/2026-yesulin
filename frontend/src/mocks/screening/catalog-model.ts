import type {
  ApplicationFieldInput,
  PerformanceRoleTemplate,
  ScreeningRoundInput,
} from "@/features/screening/creation-types";
import type { PerformanceId, PostingId, RoleGender, RoleId } from "@/features/screening/types";
import { roleId } from "@/features/screening/types";

/** 목 데이터가 세우는 배역 원본. applicantCount는 생성할 지원자 수다. */
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
  readonly deadline: string;
  readonly status: "OPEN" | "CLOSED" | "UPCOMING";
  readonly isOpenCall: boolean;
  /** 지난 공고. 전 차수 심사 이력이 채워진 상태로 시작한다. */
  readonly finished: boolean;
  readonly roles: readonly CatalogRole[];
  readonly recruitmentStart?: string;
  readonly recruitmentEnd?: string;
  readonly rounds?: readonly ScreeningRoundInput[];
  readonly applicationFields?: readonly ApplicationFieldInput[];
  readonly applicationGuide?: string;
};

export type CatalogPerformance = {
  readonly id: PerformanceId;
  readonly posterUrl: string;
  readonly title: string;
  readonly venue: string;
  readonly roleTemplates: readonly PerformanceRoleTemplate[];
  readonly postings: CatalogPosting[];
};

export function role(
  id: string,
  name: string,
  description: string,
  quota: number,
  gender: RoleGender,
  ageMin: number,
  ageMax: number,
  applicantCount: number,
): CatalogRole {
  return { id: roleId(id), name, description, quota, gender, ageMin, ageMax, applicantCount };
}

export function template(
  id: string,
  name: string,
  description: string,
  gender: RoleGender,
  ageMin: number,
  ageMax: number,
): PerformanceRoleTemplate {
  return { id, name, description, gender, ageMin, ageMax };
}

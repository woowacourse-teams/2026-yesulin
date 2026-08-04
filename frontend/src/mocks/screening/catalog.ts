import type { PerformanceId, PostingId, RoleGender, RoleId } from "@/features/screening/types";
import { performanceId, postingId, roleId } from "@/features/screening/types";
import type {
  ApplicationFieldInput,
  PerformanceRoleTemplate,
  ScreeningRoundInput,
} from "@/features/screening/creation-types";

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
  /** 지난 시즌 공고. 전 차수 심사 이력이 채워진 상태로 시작한다. */
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

function role(
  id: string,
  name: string,
  description: string,
  quota: number,
  gender: RoleGender,
  ageMin: number,
  ageSpan: number,
  applicantCount: number,
): CatalogRole {
  return {
    id: roleId(id),
    name,
    description,
    quota,
    gender,
    ageMin,
    ageMax: ageMin + ageSpan - 1,
    applicantCount,
  };
}

function template(
  id: string,
  name: string,
  description: string,
  gender: RoleGender,
  ageMin: number,
  ageMax: number,
): PerformanceRoleTemplate {
  return { id, name, description, gender, ageMin, ageMax };
}

const SUMMER_END = performanceId("p1");
const WINTER_GUEST = performanceId("p2");

export const CATALOG: CatalogPerformance[] = [
  {
    id: SUMMER_END,
    posterUrl: "/images/performances/summerplay.jpg",
    title: "뮤지컬 <여름의 끝>",
    venue: "대학로예술극장",
    roleTemplates: [
      template("p1_t1", "서연", "여 · 20대 초중반", "FEMALE", 21, 28),
      template("p1_t2", "민호", "남 · 20대 중후반", "MALE", 24, 31),
      template("p1_t3", "정 교수", "남 · 50대", "MALE", 48, 58),
      template("p1_t4", "앙상블", "성별 무관 · 20~30대", "ANY", 21, 33),
    ],
    postings: [
      {
        id: postingId("po1"),
        performanceId: SUMMER_END,
        title: "2026 시즌 배우 모집",
        deadline: "08.20",
        status: "OPEN",
        isOpenCall: false,
        finished: false,
        roles: [
          role("po1_r1", "서연", "여 · 20대 초중반", 1, "FEMALE", 21, 8, 8),
          role("po1_r2", "민호", "남 · 20대 중후반", 1, "MALE", 24, 8, 7),
          role("po1_r3", "정 교수", "남 · 50대", 1, "MALE", 48, 11, 5),
          role("po1_r4", "앙상블", "성별 무관 · 20~30대", 6, "ANY", 21, 13, 10),
        ],
      },
      {
        id: postingId("po2"),
        performanceId: SUMMER_END,
        title: "앙상블 추가 모집",
        deadline: "08.02",
        status: "CLOSED",
        isOpenCall: false,
        finished: false,
        roles: [role("po2_r1", "앙상블", "성별 무관 · 20~30대", 4, "ANY", 22, 12, 9)],
      },
      {
        id: postingId("po0"),
        performanceId: SUMMER_END,
        title: "2025 시즌 배우 모집",
        deadline: "2025.07.30",
        status: "CLOSED",
        isOpenCall: false,
        finished: true,
        roles: [
          role("po0_r1", "서연", "여 · 20대 초중반", 1, "FEMALE", 21, 8, 5),
          role("po0_r2", "민호", "남 · 20대 중후반", 1, "MALE", 24, 8, 4),
          role("po0_r3", "앙상블", "성별 무관 · 20~30대", 5, "ANY", 21, 13, 6),
        ],
      },
    ],
  },
  {
    id: WINTER_GUEST,
    posterUrl: "/images/performances/nightfall.jpg",
    title: "연극 <겨울 손님>",
    venue: "소극장 산울림",
    roleTemplates: [
      template("p2_t1", "윤희", "여 · 30대", "FEMALE", 30, 38),
      template("p2_t2", "남자 1", "남 · 40대", "MALE", 39, 48),
      template("p2_t3", "딸", "여 · 20대", "FEMALE", 22, 30),
      template("p2_t4", "아버지", "남 · 60대", "MALE", 58, 66),
      template("p2_t5", "전체 지원자", "배역 구분 없음", "ANY", 24, 37),
    ],
    postings: [
      {
        id: postingId("po3"),
        performanceId: WINTER_GUEST,
        title: "초연 배우 모집",
        deadline: "09.05",
        status: "OPEN",
        isOpenCall: false,
        finished: false,
        roles: [
          role("po3_r1", "윤희", "여 · 30대", 1, "FEMALE", 30, 9, 6),
          role("po3_r2", "남자 1", "남 · 40대", 2, "MALE", 39, 10, 6),
        ],
      },
      {
        id: postingId("po5"),
        performanceId: WINTER_GUEST,
        title: "2026 가을 시즌 배우 모집",
        deadline: "2026.10.01",
        status: "UPCOMING",
        isOpenCall: false,
        finished: false,
        roles: [
          role("po5_r1", "딸", "여 · 20대", 1, "FEMALE", 22, 9, 0),
          role("po5_r2", "아버지", "남 · 60대", 1, "MALE", 58, 9, 0),
        ],
      },
      {
        id: postingId("po4"),
        performanceId: WINTER_GUEST,
        title: "낭독공연 배우 모집",
        deadline: "2026.05.18",
        status: "CLOSED",
        isOpenCall: true,
        finished: true,
        roles: [role("po4_all", "전체 지원자", "배역 구분 없음", 4, "ANY", 24, 14, 6)],
      },
    ],
  },
];

export const ROUND_NAMES = {
  1: "1차 서류",
  2: "2차 오디션",
  3: "3차 최종",
} as const;

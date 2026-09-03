import {
  APPLICATION_FIELD_OPTIONS,
  MAX_VIDEO_REQUIREMENTS,
  type ApplicationFieldInput,
  type ApplicationFieldKey,
  type AuditionRoundInput,
  type PhotoRequirement,
  type VideoRequirement,
} from "@/features/auditions/creation-types";
import { performanceId, postingId, roleId, type RoleGender } from "@/features/auditions/types";
import type { CatalogPerformance, CatalogPosting, CatalogRole } from "./catalog-model";

type CustomQuestionFixture = {
  readonly id: string;
  readonly label: string;
  readonly required?: boolean;
};

type ApplicationFixtureOptions = {
  readonly enabledKeys: readonly ApplicationFieldKey[];
  readonly photoRequirements?: readonly PhotoRequirement[];
  readonly videoRequirements?: readonly VideoRequirement[];
  readonly customQuestions?: readonly CustomQuestionFixture[];
};

/** 지원 양식 시나리오가 필드 계약의 기본 메타데이터를 반복하지 않게 한다. */
export function applicationFieldFixture({
  enabledKeys,
  photoRequirements,
  videoRequirements,
  customQuestions = [],
}: ApplicationFixtureOptions): readonly ApplicationFieldInput[] {
  const enabled = new Set<ApplicationFieldKey>(enabledKeys);
  const standard = APPLICATION_FIELD_OPTIONS.map((field): ApplicationFieldInput => {
    const isEnabled = enabled.has(field.key);
    const config = field.key === "PHOTOS" && photoRequirements
      ? { ...field.config, maxCount: photoRequirements.reduce((sum, item) => sum + item.count, 0), photoRequirements }
      : field.key === "VIDEO" && videoRequirements
        ? { ...field.config, maxCount: MAX_VIDEO_REQUIREMENTS, videoRequirements }
        : field.config;
    return {
      id: field.key,
      key: field.key,
      label: field.label,
      enabled: isEnabled,
      required: isEnabled && (field.section === "BASIC" || field.section === "MATERIALS"),
      custom: false,
      section: field.section,
      inputType: field.inputType,
      order: field.order,
      layout: field.layout,
      config,
    };
  });
  const custom = customQuestions.map((question, index): ApplicationFieldInput => ({
    id: question.id,
    label: question.label,
    enabled: true,
    required: question.required ?? true,
    custom: true,
    section: "CUSTOM",
    inputType: "TEXTAREA",
    order: (index + 1) * 10,
    layout: "FULL",
    config: { maxLength: 2000 },
  }));
  return [...standard, ...custom];
}

export function roundFixture(count: 1 | 2 | 3 | 4 | 5): readonly AuditionRoundInput[] {
  const names = ["서류 심사", "현장 오디션", "최종 오디션", "콜백 오디션", "최종 미팅"] as const;
  const notes = ["제출 자료를 검토합니다.", "지정 연기와 자유 연기를 진행합니다.", "연출진과 최종 장면을 진행합니다.", "추가 확인이 필요한 장면을 진행합니다.", "출연 조건과 일정을 확인합니다."] as const;
  return names.slice(0, count).map((name, index) => ({
    round: (index + 1) as AuditionRoundInput["round"],
    name,
    date: `2026-10-${String(2 + index * 7).padStart(2, "0")}`,
    note: notes[index]!,
    venue: "",
    venueAddress: { roadAddress: "", detailAddress: "", zonecode: "", latitude: null, longitude: null },
  }));
}

export function roleFixture({
  id,
  name,
  description = "시나리오 검증용 모집 배역",
  quota = 1,
  gender = "ANY",
  ageMin = 20,
  ageMax = 40,
  applicantCount = 0,
}: {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly quota?: number;
  readonly gender?: RoleGender;
  readonly ageMin?: number;
  readonly ageMax?: number;
  readonly applicantCount?: number;
}): CatalogRole {
  return { id: roleId(id), name, description, quota, gender, ageMin, ageMax, applicantCount };
}

type PostingFixtureInput = Pick<CatalogPosting, "title" | "roles" | "applicationFields"> & {
  readonly id: string;
  readonly performanceId: string;
  readonly rounds?: readonly AuditionRoundInput[];
  readonly status?: CatalogPosting["status"];
  readonly allowsMultipleRoles?: boolean;
  readonly applicationGuide?: string;
};

export function postingFixture(input: PostingFixtureInput): CatalogPosting {
  return {
    id: postingId(input.id),
    performanceId: performanceId(input.performanceId),
    title: input.title,
    posterUrl: "/images/performances/moonlight.jpg",
    performanceStart: "2026-11-01",
    performanceEnd: "2026-12-20",
    deadline: "2026.09.30",
    status: input.status ?? "OPEN",
    isOpenCall: false,
    allowsMultipleRoles: input.allowsMultipleRoles ?? false,
    finished: false,
    roles: input.roles,
    recruitmentStart: "2026-08-01T09:00",
    recruitmentEnd: "2026-09-30T23:59",
    rehearsalVenue: "대학로 연습실 A",
    rehearsalVenueAddress: {
      roadAddress: "서울특별시 종로구 대학로12길 21",
      detailAddress: "3층 A연습실",
      zonecode: "03086",
      latitude: 37.58242,
      longitude: 127.00318,
    },
    rounds: input.rounds ?? roundFixture(1),
    applicationFields: input.applicationFields,
    applicationGuide: input.applicationGuide ?? "프론트엔드 시나리오 검증용 목 공고입니다.",
  };
}

export function performanceFixture(postings: CatalogPosting[]): CatalogPerformance {
  return {
    id: performanceId("seed_performance_1"),
    posterUrl: "/images/performances/moonlight.jpg",
    title: "달빛 아래 우리",
    venue: "대학로 예술극장 대극장",
    venueAddress: {
      roadAddress: "서울특별시 종로구 대학로10길 17",
      detailAddress: "대학로 예술극장 대극장",
      zonecode: "03086",
      latitude: 37.5812,
      longitude: 127.0033,
    },
    performanceStart: postings[0]?.performanceStart ?? "",
    performanceEnd: postings[0]?.performanceEnd ?? "",
    roleTemplates: postings.flatMap((posting) => posting.roles.map((role) => ({
      id: `template_${role.id}`,
      name: role.name,
      description: role.description,
    }))),
    postings,
  };
}

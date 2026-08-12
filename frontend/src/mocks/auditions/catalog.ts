import type { CatalogPerformance } from "./catalog-model";
import { defaultApplicationFields } from "@/features/auditions/creation-types";
import { performanceId, postingId, roleId } from "@/features/auditions/types";

export type { CatalogPerformance, CatalogPosting, CatalogRole } from "./catalog-model";

/** 정책 흐름과 심사 화면을 바로 확인할 수 있는 최소 시드 공연 1건. */
export const CATALOG: CatalogPerformance[] = [{
  id: performanceId("seed_performance_1"),
  posterUrl: "/images/performances/moonlight.jpg",
  title: "달빛 아래 우리",
  venue: "대학로 예술극장 대극장",
  roleTemplates: [
    { id: "seed_template_seoyeon", name: "서연", description: "차분하지만 단단한 중심을 가진 인물", gender: "FEMALE", ageMin: 22, ageMax: 32 },
    { id: "seed_template_jiwoo", name: "지우", description: "밝고 유연한 에너지의 인물", gender: "ANY", ageMin: 20, ageMax: 35 },
  ],
  postings: [{
    id: postingId("seed_posting_1"),
    performanceId: performanceId("seed_performance_1"),
    title: "2026 하반기 주·조연 배우 모집",
    deadline: "2026.09.30",
    status: "OPEN",
    isOpenCall: false,
    allowsMultipleRoles: true,
    finished: false,
    roles: [
      { id: roleId("seed_role_seoyeon"), name: "서연", description: "차분하지만 단단한 중심을 가진 인물", quota: 1, gender: "FEMALE", ageMin: 22, ageMax: 32, applicantCount: 1 },
      { id: roleId("seed_role_jiwoo"), name: "지우", description: "밝고 유연한 에너지의 인물", quota: 2, gender: "ANY", ageMin: 20, ageMax: 35, applicantCount: 1 },
    ],
    recruitmentStart: "2026-08-01",
    recruitmentEnd: "2026-09-30",
    rounds: [
      { round: 1, name: "서류 심사", date: "2026-10-02", note: "프로필과 제출 자료를 검토합니다." },
      { round: 2, name: "현장 오디션", date: "2026-10-10", note: "지정 연기와 자유 연기를 진행합니다." },
    ],
    applicationFields: defaultApplicationFields(),
    applicationGuide: "최근 6개월 이내 촬영한 사진과 일부공개 연기 영상 링크를 제출해 주세요.",
  }],
}];

export const ROUND_NAMES = { 1: "1차 서류", 2: "2차 오디션", 3: "3차 최종" } as const;

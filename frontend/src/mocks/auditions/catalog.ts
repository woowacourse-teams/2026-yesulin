import type { CatalogPerformance } from "./catalog-model";
import { performanceId, postingId, roleId } from "@/features/auditions/types";
import { allFieldsApplicationFixture, screeningFlowApplicationFixture } from "./application-field-fixtures";

export type { CatalogPerformance, CatalogPosting, CatalogRole } from "./catalog-model";

/** 정책 흐름과 심사 화면을 바로 확인할 수 있는 최소 시드 공연 1건. */
export const CATALOG: CatalogPerformance[] = [{
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
  roleTemplates: [
    { id: "seed_template_seoyeon", name: "서연", description: "차분하지만 단단한 중심을 가진 인물" },
    { id: "seed_template_jiwoo", name: "지우", description: "밝고 유연한 에너지의 인물" },
  ],
  postings: [{
    id: postingId("seed_posting_1"),
    performanceId: performanceId("seed_performance_1"),
    title: "2026 하반기 주·조연 배우 모집",
    posterUrl: "/images/performances/moonlight.jpg",
    performanceStart: "2026-11-01",
    performanceEnd: "2026-12-20",
    deadline: "2026.09.30",
    status: "OPEN",
    isOpenCall: false,
    allowsMultipleRoles: true,
    finished: false,
    roles: [
      { id: roleId("seed_role_seoyeon"), name: "서연", description: "차분하지만 단단한 중심을 가진 인물", quota: 1, gender: "FEMALE", ageMin: 22, ageMax: 32, applicantCount: 1 },
      { id: roleId("seed_role_jiwoo"), name: "지우", description: "밝고 유연한 에너지의 인물", quota: 2, gender: "ANY", ageMin: 20, ageMax: 35, applicantCount: 1 },
    ],
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
    rounds: [
      { round: 1, name: "서류 심사", date: "2026-10-02", note: "프로필과 제출 자료를 검토합니다." },
      { round: 2, name: "현장 오디션", date: "2026-10-10", note: "지정 연기와 자유 연기를 진행합니다." },
    ],
    applicationFields: screeningFlowApplicationFixture(),
    applicationGuide: "최근 6개월 이내 촬영한 사진과 일부공개 연기 영상 링크를 제출해 주세요.",
  }, {
    id: postingId("seed_posting_all_fields"),
    performanceId: performanceId("seed_performance_1"),
    title: "전체 항목·추가 질문 3문항 테스트 공고",
    posterUrl: "/images/performances/moonlight.jpg",
    performanceStart: "2026-11-01",
    performanceEnd: "2026-11-30",
    deadline: "2026.09.30",
    status: "OPEN",
    isOpenCall: false,
    allowsMultipleRoles: false,
    finished: false,
    roles: [
      { id: roleId("seed_role_all_fields"), name: "서연", description: "차분하지만 단단한 중심을 가진 인물", quota: 1, gender: "ANY", ageMin: 0, ageMax: 100, applicantCount: 0 },
    ],
    recruitmentStart: "2026-08-18T09:00",
    recruitmentEnd: "2026-09-30T23:59",
    rehearsalVenue: "대학로 연습실 A",
    rehearsalVenueAddress: {
      roadAddress: "서울특별시 종로구 대학로12길 21",
      detailAddress: "3층 A연습실",
      zonecode: "03086",
      latitude: 37.58242,
      longitude: 127.00318,
    },
    rounds: [
      { round: 1, name: "서류 심사", date: "2026-10-05", note: "제출한 전체 지원 정보를 검토합니다." },
    ],
    applicationFields: allFieldsApplicationFixture(),
    applicationGuide: "모든 기본·추가정보와 프로필 사진, 연기 영상, 추가 질문 3개를 확인하기 위한 테스트 공고입니다.",
  }],
}];

export const ROUND_NAMES = { 1: "1차 서류", 2: "2차 오디션", 3: "3차 최종", 4: "4차 전형", 5: "5차 전형" } as const;

import type { CatalogPerformance } from "./catalog-model";
import {
  allFieldsApplicationFixture,
  minimalApplicationFixture,
  screeningFlowApplicationFixture,
  withoutHeightApplicationFixture,
} from "./application-field-fixtures";
import { performanceFixture, postingFixture, roleFixture, roundFixture } from "./fixture-builders";

export type { CatalogPerformance, CatalogPosting, CatalogRole } from "./catalog-model";

const performanceId = "seed_performance_1";

const primaryPosting = postingFixture({
  id: "seed_posting_1",
  performanceId,
  title: "2026 하반기 주·조연 배우 모집",
  allowsMultipleRoles: true,
  roles: [
    roleFixture({ id: "seed_role_seoyeon", name: "서연", description: "차분하지만 단단한 중심을 가진 인물", gender: "FEMALE", ageMin: 22, ageMax: 32, applicantCount: 1 }),
    roleFixture({ id: "seed_role_jiwoo", name: "지우", description: "밝고 유연한 에너지의 인물", quota: 2, ageMin: 20, ageMax: 35, applicantCount: 1 }),
  ],
  rounds: roundFixture(2),
  applicationFields: screeningFlowApplicationFixture(),
  applicationGuide: "최근 6개월 이내 촬영한 사진과 일부공개 연기 영상 링크를 제출해 주세요.",
});

const allFieldsPosting = postingFixture({
  id: "seed_posting_all_fields",
  performanceId,
  title: "전체 항목·추가 질문 3문항 테스트 공고",
  roles: [roleFixture({ id: "seed_role_all_fields", name: "전체 항목 배역" })],
  applicationFields: allFieldsApplicationFixture(),
  applicationGuide: "모든 기본·추가정보와 사진, 영상, 추가 질문의 긴 지원 흐름을 확인합니다.",
});

const minimalPosting = postingFixture({
  id: "seed_posting_minimal",
  performanceId,
  title: "최소 기본정보 테스트 공고",
  roles: [roleFixture({ id: "seed_role_minimal", name: "앙상블" })],
  applicationFields: minimalApplicationFixture(),
  applicationGuide: "이름과 연락처, 이메일만 받아 빈 지원서 단계가 생략되는지 확인합니다.",
});

const withoutHeightPosting = postingFixture({
  id: "seed_posting_without_height",
  performanceId,
  title: "키 미수집·몸무게 수집 테스트 공고",
  roles: [roleFixture({ id: "seed_role_without_height", name: "보컬 앙상블" })],
  applicationFields: withoutHeightApplicationFixture(),
  applicationGuide: "키는 요청하지 않고 몸무게는 필수로 요청하는 독립 기본정보 계약을 확인합니다.",
});

const roundTwoPosting = postingFixture({
  id: "seed_posting_round_2",
  performanceId,
  title: "2차 현장 오디션 진행 시나리오",
  status: "CLOSED",
  roles: [roleFixture({ id: "seed_role_round_2", name: "민재", applicantCount: 4 })],
  rounds: roundFixture(2),
  applicationFields: screeningFlowApplicationFixture(),
});

const roundThreePosting = postingFixture({
  id: "seed_posting_round_3",
  performanceId,
  title: "3차 최종 오디션 진행 시나리오",
  status: "CLOSED",
  roles: [roleFixture({ id: "seed_role_round_3", name: "하윤", applicantCount: 5 })],
  rounds: roundFixture(3),
  applicationFields: screeningFlowApplicationFixture(),
});

/** URL만으로 지원 양식과 1·2·3차 심사 상태를 재현하는 결정적 시나리오 카탈로그. */
export const CATALOG: CatalogPerformance[] = [performanceFixture([
  primaryPosting,
  allFieldsPosting,
  minimalPosting,
  withoutHeightPosting,
  roundTwoPosting,
  roundThreePosting,
])];

export const ROUND_NAMES = { 1: "1차 서류", 2: "2차 오디션", 3: "3차 최종", 4: "4차 전형", 5: "5차 전형" } as const;

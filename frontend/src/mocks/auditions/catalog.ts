import type { CatalogPerformance } from "./catalog-model";

export type { CatalogPerformance, CatalogPosting, CatalogRole } from "./catalog-model";

/**
 * MSW는 생성·수정 흐름을 검증하기 위한 인메모리 저장소로만 사용한다.
 * 초기 공연·공고·배역 데이터는 두지 않는다.
 */
export const CATALOG: CatalogPerformance[] = [];

export const ROUND_NAMES = { 1: "1차 서류", 2: "2차 오디션", 3: "3차 최종" } as const;

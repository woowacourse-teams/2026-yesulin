import type { VenueAddress } from "@/features/auditions/creation-types";

/**
 * 공고 상세에 함께 보이는 공연사 요약. 백엔드 `CompanySummary`와 같다. 운영자가 공개한 공연사만 내려온다.
 * 비워 둔 항목은 null이다.
 */
export type CompanySummary = {
  readonly id: number;
  readonly name: string;
  readonly representativeName: string | null;
  readonly homepage: string | null;
  /** `YYYY-MM-DD` */
  readonly foundedOn: string | null;
  /** 주소가 있으면 시·군·구까지(예: `서울 종로구`), 없으면 지역. */
  readonly location: string | null;
};

/** 공연사 화면. 백엔드 `/api/v1/public/companies/{id}` 응답과 같다. */
export type Company = CompanySummary & {
  /** 공연사가 직접 알려 준 주소. 지도는 이 주소만 사용한다. */
  readonly address: VenueAddress | null;
  readonly phone: string | null;
  readonly description: string | null;
  readonly updatedAt: string;
};

export const companyApiPaths = {
  detail: (companyId: number | string) => `/v1/public/companies/${encodeURIComponent(String(companyId))}`,
  posts: (companyId: number | string) =>
    `/v1/public/companies/${encodeURIComponent(String(companyId))}/audition-posts`,
} as const;

export const companyRoutes = {
  detail: (companyId: number | string) => `/companies/${encodeURIComponent(String(companyId))}`,
} as const;

/** `2015-03-01` → `2015년 3월 1일` */
export function formatFoundedOn(foundedOn: string): string {
  const [year, month, day] = foundedOn.split("-").map(Number);
  if (!year || !month || !day) return foundedOn;
  return `${year}년 ${month}월 ${day}일`;
}

/** 홈페이지 주소를 화면에 짧게 보인다. `https://www.yesulin.art/` → `yesulin.art` */
export function displayHomepage(homepage: string): string {
  try {
    const url = new URL(homepage);
    const path = url.pathname === "/" ? "" : url.pathname;
    return `${url.host.replace(/^www\./, "")}${path}`;
  } catch {
    return homepage;
  }
}

/**
 * 공연사 정보 수정·삭제 요청 창구(예술in 카카오톡 채널 상담). 요청자 정보를 우리 서버에 따로 모으지 않고, 운영자가 공연사인지
 * 확인한 뒤 반영한다.
 */
export const COMPANY_CORRECTION_URL = "http://pf.kakao.com/_pbTBX/chat";

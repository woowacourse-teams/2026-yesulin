import type { VenueAddress } from "@/features/auditions/creation-types";

/**
 * 공고 상세에 함께 보이는 공연사 요약. 백엔드 `CompanySummary`와 같다. 운영자가 공개한 공연사만 내려온다.
 * 비워 둔 항목은 null이다.
 */
export type CompanySummary = {
  readonly id: number;
  readonly name: string;
  readonly representativeName: string | null;
  /** 홈페이지·SNS 같은 링크. 최대 3개, 없으면 빈 배열. */
  readonly links: readonly string[];
  /** `YYYY-MM-DD` */
  readonly foundedOn: string | null;
  /** 주소가 있으면 시·군·구까지(예: `서울 종로구`), 없으면 지역. */
  readonly location: string | null;
  /** 대표 사진 주소. 없으면 null이고 화면이 이름 첫 글자 이미지를 보인다. */
  readonly photoUrl: string | null;
};

/** 공연사 화면. 백엔드 `/api/v1/public/companies/{id}` 응답과 같다. */
export type Company = CompanySummary & {
  /** 공연사가 직접 알려 준 주소. 지도는 이 주소만 사용한다. */
  readonly address: VenueAddress | null;
  readonly phone: string | null;
  readonly description: string | null;
  /** 연혁. 줄바꿈을 그대로 보여 준다. */
  readonly history: string | null;
  readonly updatedAt: string;
};

export const companyApiPaths = {
  detail: (companyId: number | string) => `/v1/public/companies/${encodeURIComponent(String(companyId))}`,
  posts: (companyId: number | string) =>
    `/v1/public/companies/${encodeURIComponent(String(companyId))}/audition-posts`,
  editRequests: (companyId: number | string) =>
    `/v1/public/companies/${encodeURIComponent(String(companyId))}/edit-requests`,
  editRequestPhotoUploads: (companyId: number | string) =>
    `/v1/public/companies/${encodeURIComponent(String(companyId))}/edit-requests/photo-uploads`,
} as const;

export const companyRoutes = {
  detail: (companyId: number | string) => `/companies/${encodeURIComponent(String(companyId))}`,
  editRequest: (companyId: number | string) => `/companies/${encodeURIComponent(String(companyId))}/edit-request`,
} as const;

/** 공연사가 비워 두었거나 공개하지 않은 항목에 보이는 말. */
export const UNDISCLOSED = "비공개";

/** `2015-03-01` → `2015년 3월 1일` */
export function formatFoundedOn(foundedOn: string): string {
  const [year, month, day] = foundedOn.split("-").map(Number);
  if (!year || !month || !day) return foundedOn;
  return `${year}년 ${month}월 ${day}일`;
}

/** 링크 주소를 화면에 짧게 보인다. `https://www.yesulin.art/` → `yesulin.art` */
export function displayLink(link: string): string {
  try {
    const url = new URL(link);
    const path = url.pathname === "/" ? "" : url.pathname;
    return `${url.host.replace(/^www\./, "")}${path}`;
  } catch {
    return link;
  }
}

/**
 * 예술in 카카오톡 채널 상담. 공연사 정보 삭제 요청과 아직 공연사 정보가 없는 공고의 정보 등록 요청을 받는다.
 * 공개된 공연사 정보 수정은 공연사 화면의 수정 요청(`companyRoutes.editRequest`)으로 받는다.
 */
export const COMPANY_CORRECTION_URL = "http://pf.kakao.com/_pbTBX/chat";

/**
 * 사진이 없는 공연사의 기본 이미지에 쓸 첫 글자. "(주)"·"극단" 같은 앞말을 떼고 첫 글자를 쓴다(예: `(주)크리티브` → `크`).
 * 영문은 대문자로 보인다.
 */
export function companyInitial(name: string): string {
  const core = name
    .replace(/\((?:주|사|재|유|합)\)|㈜|주식회사|사단법인|재단법인|유한회사|협동조합/g, " ")
    .replace(/^\s*(?:극단|프로젝트|컴퍼니)\s+/, "")
    .trim();
  const first = Array.from(core || name.trim()).find((character) => /[\p{L}\p{N}]/u.test(character));
  return first ? first.toUpperCase() : "?";
}

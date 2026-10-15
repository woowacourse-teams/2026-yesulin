import type { CompanySummary } from "@/features/companies/types";

/** 메인에 공개한 공고. 백엔드 `/api/v1/public/audition-posts` 응답과 같다. 원문 출처는 상세에만 있다. */
export type AuditionPostSummary = {
  readonly id: number;
  readonly category: string;
  readonly title: string;
  /** 기획사에 연결된 공고는 그 기획사의 지금 이름, 아니면 원문 닉네임이나 운영자가 쓴 이름이다. */
  readonly authorName: string;
  readonly pay: string;
  /** 원문 표현 그대로의 마감(`2026-10-31`, `상시`, `채용 시 마감` 등). */
  readonly deadlineText: string;
  /** 원문 마감이 날짜일 때만 `YYYY-MM-DD`. */
  readonly deadline: string | null;
  readonly closed: boolean;
  readonly viewCount: number;
  readonly postedAt: string | null;
  readonly thumbnailUrl: string | null;
  readonly attachmentCount: number;
};

export type AuditionPostPage = {
  readonly posts: readonly AuditionPostSummary[];
  /** 0부터 시작하는 서버 페이지. 주소의 `page`는 1부터다. */
  readonly page: number;
  readonly size: number;
  readonly totalPages: number;
  readonly totalElements: number;
  /** 선택한 분야의 모집 중·마감 포함 공개 공고 수. 분야를 생략하면 전체 분야다. */
  readonly openCount: number;
  readonly allCount: number;
};

/** 목록 주소 조건. `page`는 0부터 시작한다. */
export type AuditionPostQuery = {
  readonly page: number;
  readonly includeClosed: boolean;
  readonly category?: AuditionLandingCategory;
};

export type AuditionPostAttachment = {
  readonly name: string;
  readonly contentType: string;
  readonly size: number;
  readonly url: string;
};

export type AuditionPost = {
  readonly id: number;
  readonly category: string;
  readonly title: string;
  /** 기획사에 연결된 공고는 그 기획사의 지금 이름, 아니면 원문 닉네임이나 운영자가 쓴 이름이다. */
  readonly authorName: string;
  readonly pay: string;
  readonly deadlineText: string;
  readonly deadline: string | null;
  readonly closed: boolean;
  readonly viewCount: number;
  readonly postedAt: string | null;
  /** 서버가 허용 태그만 남긴 HTML. 사진 주소는 응답에 이미 채워져 있다. */
  readonly bodyHtml: string;
  readonly tags: readonly string[];
  readonly attachments: readonly AuditionPostAttachment[];
  /** 원문 공고 사이트 이름(예: `OTR`). 상세에 작은 출처 링크로 보여 준다. */
  readonly source: string;
  /** 원문 주소. 원문 없이 직접 쓴 공고는 null이다. */
  readonly sourceUrl: string | null;
  readonly updatedAt: string;
  /** 공고를 올린 공연사. 연결이 없거나 운영자가 공연사를 공개하기 전이면 null이다. */
  readonly company: CompanySummary | null;
};

export const AUDITION_POST_PAGE_SIZE = 12;

/** 백엔드 공개 API 경로(`/api` 앞부분 제외). 브라우저와 서버 조회가 함께 쓴다. */
export const auditionPostApiPaths = {
  list: ({ page, includeClosed, category }: AuditionPostQuery, size = AUDITION_POST_PAGE_SIZE) => {
    const params = new URLSearchParams({ page: String(page), size: String(size), includeClosed: String(includeClosed) });
    if (category) params.set("category", category);
    return `/v1/public/audition-posts?${params}`;
  },
  detail: (postId: number | string) => `/v1/public/audition-posts/${encodeURIComponent(String(postId))}`,
  view: (postId: number) => `/v1/public/audition-posts/${postId}/views`,
  redirect: (postId: number | string) => `/v1/public/audition-posts/${encodeURIComponent(String(postId))}/redirects`,
} as const;

/** 공고 알림을 받는 카카오톡 오픈채팅방. */
export const AUDITION_ALERT_CHAT_URL = "https://open.kakao.com/o/pCRrDXOi";

/** 우리 서비스가 게시하는 공고 분류. 백엔드 `AuditionCategory`와 같다. */
export const AUDITION_POST_CATEGORIES = ["연극", "퍼포먼스", "뮤지컬", "단원", "기획사"] as const;

export const AUDITION_LANDING_CATEGORIES = {
  musical: "뮤지컬",
  theater: "연극",
  performance: "퍼포먼스",
  troupe: "단원",
  agency: "기획사",
} as const;

export type AuditionLandingCategory = typeof AUDITION_LANDING_CATEGORIES[keyof typeof AUDITION_LANDING_CATEGORIES];

export function auditionLandingCategory(slug: string): AuditionLandingCategory | undefined {
  return Object.hasOwn(AUDITION_LANDING_CATEGORIES, slug)
    ? AUDITION_LANDING_CATEGORIES[slug as keyof typeof AUDITION_LANDING_CATEGORIES]
    : undefined;
}

export const auditionPostRoutes = {
  /** 기본값(첫 페이지·모집 중만)은 주소에서 뺀다. */
  list: ({ page = 0, includeClosed = false, category }: Partial<AuditionPostQuery> = {}) => {
    const slug = Object.entries(AUDITION_LANDING_CATEGORIES).find(([, label]) => label === category)?.[0];
    const path = slug ? `/auditions/${slug}` : "/auditions";
    const params = new URLSearchParams();
    if (includeClosed) params.set("closed", "1");
    if (page > 0) params.set("page", String(page + 1));
    const query = params.toString();
    return query ? `${path}?${query}` : path;
  },
  detail: (postId: number | string) => `/posts/${encodeURIComponent(String(postId))}`,
} as const;

/** 기획사가 자기 공고를 올리고 고치는 관리 화면. */
export const producerAuditionPostRoutes = {
  list: "/producers/audition-posts",
  create: "/producers/audition-posts/new",
  edit: (postId: number | string) => `/producers/audition-posts/${encodeURIComponent(String(postId))}/edit`,
} as const;

/** 주소의 `?page=2&closed=1`을 서버 조건으로 바꾼다. 잘못된 값은 첫 페이지·모집 중으로 본다. */
export function parseAuditionPostQuery(params: {
  readonly page?: string | readonly string[];
  readonly closed?: string | readonly string[];
}): AuditionPostQuery {
  const first = (value: string | readonly string[] | undefined) => Array.isArray(value) ? value[0] : value;
  const page = Number(first(params.page));
  return {
    page: Number.isInteger(page) && page >= 1 && page <= 10_000 ? page - 1 : 0,
    includeClosed: first(params.closed) === "1",
  };
}

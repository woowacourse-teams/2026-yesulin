/** 메인에 게시한 공고. 백엔드 `/api/v1/public/audition-posts` 응답과 같다. 원문 출처는 공개 응답에 없다. */
export type AuditionPostSummary = {
  readonly id: number;
  readonly category: string;
  readonly title: string;
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
  /** 모집 중인 공고 수와 마감 포함 전체 수. 필터 버튼 숫자에 쓴다. */
  readonly openCount: number;
  readonly allCount: number;
};

/** 목록 주소 조건. `page`는 0부터 시작한다. */
export type AuditionPostQuery = {
  readonly page: number;
  readonly includeClosed: boolean;
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
  readonly updatedAt: string;
};

export const AUDITION_POST_PAGE_SIZE = 12;

/** 백엔드 공개 API 경로(`/api` 앞부분 제외). 브라우저와 서버 조회가 함께 쓴다. */
export const auditionPostApiPaths = {
  list: ({ page, includeClosed }: AuditionPostQuery) =>
    `/v1/public/audition-posts?page=${page}&size=${AUDITION_POST_PAGE_SIZE}&includeClosed=${includeClosed}`,
  detail: (postId: number | string) => `/v1/public/audition-posts/${encodeURIComponent(String(postId))}`,
  view: (postId: number) => `/v1/public/audition-posts/${postId}/views`,
} as const;

/** 공고 알림을 받는 카카오톡 오픈채팅방. */
export const AUDITION_ALERT_CHAT_URL = "https://open.kakao.com/o/pCRrDXOi";

export const auditionPostRoutes = {
  /** 기본값(첫 페이지·모집 중만)은 주소에서 뺀다. */
  list: ({ page = 0, includeClosed = false }: Partial<AuditionPostQuery> = {}) => {
    const params = new URLSearchParams();
    if (includeClosed) params.set("closed", "1");
    if (page > 0) params.set("page", String(page + 1));
    const query = params.toString();
    return query ? `/?${query}` : "/";
  },
  detail: (postId: number | string) => `/posts/${encodeURIComponent(String(postId))}`,
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

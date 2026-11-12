import type { ProfileCareerGenre } from "@/features/applicants/career-genre";
import type { EducationLevel } from "@/features/applicants/types";

export type ActorGender = "FEMALE" | "MALE";

/** 배우 목록 카드. 키·몸무게는 입력했으면 항상 공개되는 값이다. */
export type PublicActorPageSummary = {
  readonly publicId: string;
  readonly handle: string;
  readonly name: string;
  readonly gender: ActorGender;
  readonly birthYear: number;
  readonly age: number;
  readonly height: number | null;
  readonly weight: number | null;
  readonly representativePhotoUrl: string | null;
};

export type PublicActorPageList = {
  readonly actorPages: readonly PublicActorPageSummary[];
  readonly page: number;
  readonly size: number;
  readonly totalPages: number;
  readonly totalElements: number;
};

export type ActorCareerGroup = {
  /** 장르를 고르지 않은 경력(미분류)은 null이다. */
  readonly genre: ProfileCareerGenre | null;
  readonly careers: readonly { readonly year: number; readonly month?: number | null; readonly title: string; readonly roleName: string }[];
};

/** 누구나 보는 배우 페이지. 서버가 배우가 공개로 설정한 항목만 담아 보낸다. */
export type PublicActorPage = PublicActorPageSummary & {
  readonly photos: readonly { readonly url: string }[];
  readonly videos: readonly { readonly url: string; readonly youtubeId: string }[];
  readonly careerGroups: readonly ActorCareerGroup[];
  readonly coverLetter: string | null;
  readonly specialty: string | null;
  readonly hobbies: string | null;
  readonly nationality: string | null;
  readonly education: {
    readonly level: EducationLevel | null;
    readonly school: string | null;
    readonly major: string | null;
  } | null;
  readonly links: readonly { readonly url: string }[];
};

/**
 * 본인 미리보기. 공개 조회와 같은 모양이지만 공개 조건과 무관하게 주므로 이름·성별·생년월일을 아직 입력하지 않았거나
 * 아이디를 정하지 않았으면 비어 있다. 공개 페이지도 이 모양으로 그릴 수 있다.
 */
export type ActorPageContent = Omit<PublicActorPage, "publicId" | "handle" | "name" | "gender" | "birthYear" | "age"> & {
  readonly publicId: string | null;
  readonly handle: string | null;
  readonly name: string | null;
  readonly gender: ActorGender | null;
  readonly birthYear: number | null;
  readonly age: number | null;
};

export const ACTOR_LIST_PAGE_SIZE = 12;

/** 배우에게 연락하거나 문제가 있는 페이지를 알릴 때 쓰는 예술in 카카오톡 채널. */
export const ACTOR_PAGE_INQUIRY_URL = "https://pf.kakao.com/_pbTBX/chat";

const HANDLE = /^(?!\.)(?!.*\.\.)(?!.*\.$)[a-z0-9._]{1,30}$/;

/** 주소의 아이디는 대소문자를 가리지 않는다. 정규 아이디(소문자)는 서버 응답으로 정한다. */
export function isActorHandleAddress(value: string): boolean {
  return HANDLE.test(value.toLowerCase());
}

export const ACTOR_SEARCH_MAX_LENGTH = 30;

export const actorPageApiPaths = {
  list: (page: number, size = ACTOR_LIST_PAGE_SIZE, keyword = "") =>
    `/v1/public/actor-pages?page=${page}&size=${size}&sort=recent${keyword ? `&q=${encodeURIComponent(keyword)}` : ""}`,
  detail: (handle: string) => `/v1/public/actor-pages/by-handle/${encodeURIComponent(handle)}`,
} as const;

export const actorPageRoutes = {
  /** 목록 주소의 page는 1부터 센다. 첫 페이지와 빈 검색어는 쿼리를 붙이지 않는다. */
  list: (page = 0, keyword = "") => {
    const query = new URLSearchParams();
    if (keyword) query.set("q", keyword);
    if (page > 0) query.set("page", String(page + 1));
    const text = query.toString();
    return text ? `/actors?${text}` : "/actors";
  },
  detail: (handle: string) => `/actors/@${handle}`,
} as const;

/** 목록 주소의 `?page=`(1부터)를 API의 page(0부터)로 바꾼다. 잘못된 값은 첫 페이지다. */
export function parseActorListPage(value: string | readonly string[] | undefined): number {
  const page = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(page) && page >= 1 && page <= 10_000 ? page - 1 : 0;
}

/** 목록 주소의 `?q=`. 앞뒤 공백과 아이디 앞의 @를 떼고 서버 한도까지만 쓴다. */
export function parseActorListKeyword(value: string | readonly string[] | undefined): string {
  const raw = Array.isArray(value) ? value[0] : value;
  return (raw ?? "").trim().replace(/^@/, "").trim().slice(0, ACTOR_SEARCH_MAX_LENGTH);
}

/** 빈 목록에서 되돌아갈 곳. 뒤 페이지는 같은 검색의 첫 페이지로, 첫 페이지의 검색 결과는 전체 목록으로 보낸다. */
export function emptyListRecovery(page: number, keyword: string): { readonly href: string; readonly label: string } | null {
  if (page > 0) return { href: actorPageRoutes.list(0, keyword), label: "첫 페이지로" };
  if (keyword) return { href: actorPageRoutes.list(), label: "전체 배우 보기" };
  return null;
}

/** 아이디 입력값을 서버와 같은 규칙(앞뒤 공백 제거·소문자)으로 바꾼다. */
export function normalizeActorHandle(value: string): string {
  return value.trim().toLowerCase();
}

const GENDER_LABELS: Readonly<Record<ActorGender, string>> = { FEMALE: "여성", MALE: "남성" };

/** `여성 · 2000년생(만 25세)`처럼 성별과 나이를 한 줄로 쓴다. */
export function actorIdentityLine(actor: Pick<PublicActorPageSummary, "gender" | "birthYear" | "age">): string {
  return `${GENDER_LABELS[actor.gender]} · ${actor.birthYear}년생(만 ${actor.age}세)`;
}

/** 입력한 키·몸무게만 `170cm · 55kg`처럼 쓴다. 둘 다 없으면 null이다. */
export function actorBodyLine(actor: Pick<PublicActorPageSummary, "height" | "weight">): string | null {
  const parts = [actor.height ? `${actor.height}cm` : null, actor.weight ? `${actor.weight}kg` : null].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

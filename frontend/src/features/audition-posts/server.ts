import "server-only";
import { cache } from "react";
import { auditionPostApiPaths, type AuditionPost, type AuditionPostPage, type AuditionPostQuery } from "./types";

const REDIRECT_COUNT_TIMEOUT_MS = 1_500;
const READ_TIMEOUT_MS = 10_000;
const SITEMAP_PAGE_SIZE = 48;

/** 상세 SSR 조회 결과. 숨긴 공고는 백엔드가 원문 공고 주소로 302를 준다. */
export type AuditionPostLookup =
  | { readonly kind: "published"; readonly post: AuditionPost }
  | { readonly kind: "hidden"; readonly originalUrl: string }
  | { readonly kind: "missing" }
  | { readonly kind: "client-only" };

/**
 * 메인 목록과 상세의 최초 SSR·메타데이터용 조회. 목 환경은 브라우저 MSW만 응답하므로 null을 돌려주고
 * 화면이 클라이언트에서 다시 조회한다. 실제 조회 오류는 전파하고, 숨긴 공고의 원문 이동은 따라가지 않는다.
 */
async function fetchForServer(path: string, init?: RequestInit): Promise<Response | null> {
  const origin = process.env.API_ORIGIN;
  if (!origin || process.env.NEXT_PUBLIC_API_MOCKING === "enabled") return null;
  return fetch(new URL(path, origin), {
    cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(READ_TIMEOUT_MS), ...init,
  });
}

function httpsLocation(response: Response): string | null {
  const location = response.headers.get("location");
  if (!location) return null;
  try {
    const url = new URL(location);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export async function auditionPostPageForServer(query: AuditionPostQuery): Promise<AuditionPostPage | null> {
  // 메인 목록은 기존처럼 조회 실패 시 브라우저에서 재시도한다.
  try {
    return await publishedPageForServer(query);
  } catch {
    return null;
  }
}

async function publishedPageForServer(query: AuditionPostQuery, size?: number): Promise<AuditionPostPage | null> {
  const response = await fetchForServer(`/api${auditionPostApiPaths.list(query, size)}`);
  if (!response) return null;
  if (!response.ok) throw new Error(`공개 공고 목록 조회 실패: ${response.status}`);
  return response.json() as Promise<AuditionPostPage>;
}

/** 마감 여부와 무관하게 공개된 모든 페이지를 읽는다. 실패한 페이지를 빈 목록으로 바꾸지 않는다. */
export async function auditionPostIdsForSitemap(): Promise<readonly number[]> {
  const first = await publishedPageForServer({ page: 0, includeClosed: true }, SITEMAP_PAGE_SIZE);
  if (!first) return [];
  const ids = new Set(first.posts.map((post) => post.id));
  for (let page = 1; page < first.totalPages; page += 1) {
    const result = await publishedPageForServer({ page, includeClosed: true }, SITEMAP_PAGE_SIZE);
    if (!result) throw new Error("공개 공고 사이트맵 조회 중 서버 API 설정이 변경되었습니다.");
    result.posts.forEach((post) => ids.add(post.id));
  }
  return [...ids];
}

/** 메타데이터와 본문이 같은 조회 결과를 사용한다. 실제 404만 missing으로 처리한다. */
export const auditionPostForServer = cache(async (postId: string): Promise<AuditionPostLookup> => {
  const response = await fetchForServer(`/api${auditionPostApiPaths.detail(postId)}`);
  if (!response) return { kind: "client-only" };
  if (response.status === 404) return { kind: "missing" };
  if (response.status === 302) {
    const originalUrl = httpsLocation(response);
    if (!originalUrl) throw new Error("숨긴 공고의 원문 주소가 올바르지 않습니다.");
    return { kind: "hidden", originalUrl };
  }
  if (!response.ok) throw new Error(`공개 공고 조회 실패: ${response.status}`);
  return { kind: "published", post: await response.json() as AuditionPost };
});

/** 숨긴 공고를 원문으로 보내기 직전에 이동 수를 한 번 센다. 기록에 실패하거나 1.5초 안에 끝나지 않아도 이동은 막지 않는다. */
export async function recordAuditionPostRedirect(postId: string): Promise<void> {
  try {
    await fetchForServer(`/api${auditionPostApiPaths.redirect(postId)}`, {
      method: "POST",
      signal: AbortSignal.timeout(REDIRECT_COUNT_TIMEOUT_MS),
    });
  } catch {
    // 이동 수 기록 실패가 원문 이동을 막지 않는다.
  }
}

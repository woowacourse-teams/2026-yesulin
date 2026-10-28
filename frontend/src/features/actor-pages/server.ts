import "server-only";
import { cache } from "react";
import { actorPageApiPaths, type PublicActorPage, type PublicActorPageList } from "./types";

const READ_TIMEOUT_MS = 10_000;
const SITEMAP_PAGE_SIZE = 48;

/** 배우 페이지 SSR 조회 결과. 목 환경이나 서버 API가 없으면 브라우저에서 다시 읽는다. */
export type ActorPageLookup =
  | { readonly kind: "public"; readonly actorPage: PublicActorPage }
  | { readonly kind: "missing" }
  | { readonly kind: "client-only" };

/** 목 환경은 브라우저 MSW만 응답하므로 서버 조회를 건너뛴다. */
async function fetchForServer(path: string): Promise<Response | null> {
  const origin = process.env.API_ORIGIN;
  if (!origin || process.env.NEXT_PUBLIC_API_MOCKING === "enabled") return null;
  return fetch(new URL(`/api${path}`, origin), { cache: "no-store", signal: AbortSignal.timeout(READ_TIMEOUT_MS) });
}

/** 서버에서 읽지 않으면 null이고 화면이 브라우저에서 다시 읽는다. */
export async function actorPagesForServer(page: number): Promise<PublicActorPageList | null> {
  const response = await fetchForServer(actorPageApiPaths.list(page));
  if (!response) return null;
  if (!response.ok) throw new Error(`배우 목록 조회 실패: ${response.status}`);
  return await response.json() as PublicActorPageList;
}

/** 메타데이터와 본문이 같은 조회 결과를 쓴다. 실제 404만 missing으로 처리한다. */
export const actorPageForServer = cache(async (handle: string): Promise<ActorPageLookup> => {
  const response = await fetchForServer(actorPageApiPaths.detail(handle));
  if (!response) return { kind: "client-only" };
  if (response.status === 404) return { kind: "missing" };
  if (!response.ok) throw new Error(`배우 페이지 조회 실패: ${response.status}`);
  return { kind: "public", actorPage: await response.json() as PublicActorPage };
});

/** 사이트맵에 넣을 공개 배우 아이디. 서버에서 읽지 않는 환경은 빈 목록이다. */
export async function actorHandlesForSitemap(): Promise<readonly string[]> {
  const handles: string[] = [];
  for (let page = 0; ; page += 1) {
    const response = await fetchForServer(actorPageApiPaths.list(page, SITEMAP_PAGE_SIZE));
    if (!response) return handles;
    if (!response.ok) throw new Error(`배우 목록 사이트맵 조회 실패: ${response.status}`);
    const result = await response.json() as PublicActorPageList;
    result.actorPages.forEach((actor) => handles.push(actor.handle));
    if (page + 1 >= result.totalPages) return handles;
  }
}

import "server-only";
import { cache } from "react";
import type { PublicShow, PublicShowSummary } from "./types";

type PublicShowResult =
  | { readonly status: "ready"; readonly show: PublicShow }
  | { readonly status: "missing" }
  | { readonly status: "client-only" };

/** 목 환경은 브라우저 MSW만 응답하므로 서버 조회를 건너뛴다. */
async function publicResponseForServer(path: string): Promise<Response | null> {
  const origin = process.env.API_ORIGIN;
  if (!origin || process.env.NEXT_PUBLIC_API_MOCKING === "enabled") return null;
  return fetch(new URL(path, origin), {
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
}

/** 빈 목록과 조회 실패를 구분한다. 실패 시 사이트맵에서 공연 주소를 지우지 않는다. */
export async function publicShowsForServer(): Promise<readonly PublicShowSummary[] | null> {
  const response = await publicResponseForServer("/api/v1/public/shows");
  if (!response) return null;
  if (!response.ok) throw new Error(`공개 공연 목록 조회 실패: ${response.status}`);
  const body = await response.json() as { readonly shows: readonly PublicShowSummary[] };
  return body.shows;
}

/** 메타데이터와 본문은 같은 조회 결과를 쓴다. 일시적인 실패는 missing/noindex로 바꾸지 않는다. */
export const publicShowForServer = cache(async (showId: string): Promise<PublicShowResult> => {
  const response = await publicResponseForServer(`/api/v1/public/shows/${encodeURIComponent(showId)}`);
  if (!response) return { status: "client-only" };
  if (response.status === 404) return { status: "missing" };
  if (!response.ok) throw new Error(`공개 공연 조회 실패: ${response.status}`);
  return { status: "ready", show: await response.json() as PublicShow };
});

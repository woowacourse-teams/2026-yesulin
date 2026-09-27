import "server-only";
import type { PublicShow } from "./types";

/**
 * 메타데이터와 최초 SSR에 쓰는 공개 공연 조회. 목 환경은 브라우저 MSW만 응답하므로 null을 돌려주고,
 * 화면은 클라이언트에서 다시 조회한다.
 */
export async function publicShowForServer(showId: string): Promise<PublicShow | null> {
  const origin = process.env.API_ORIGIN;
  if (!origin || process.env.NEXT_PUBLIC_API_MOCKING === "enabled") return null;
  try {
    const response = await fetch(new URL(`/api/v1/public/shows/${encodeURIComponent(showId)}`, origin), {
      cache: "no-store",
    });
    return response.ok ? response.json() as Promise<PublicShow> : null;
  } catch {
    return null;
  }
}

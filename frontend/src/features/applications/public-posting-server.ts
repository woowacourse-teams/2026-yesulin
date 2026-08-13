import "server-only";
import { publicPostingById, type PublicPosting } from "./public-posting";
import { toPublicPosting, type PublicPostingApiResponse } from "./public-posting-api";

/**
 * 메타데이터와 최초 SSR이 같은 공개 공고 읽기 모델을 사용한다.
 * 목 환경에서는 서버 카탈로그를, 실제 API 환경에서는 명시한 origin을 조회한다.
 */
export async function publicPostingForServer(postingId: string): Promise<PublicPosting | null> {
  if (process.env.NEXT_PUBLIC_API_MOCKING !== "disabled") return publicPostingById(postingId);
  const origin = process.env.API_ORIGIN;
  if (!origin) return null;
  try {
    const response = await fetch(new URL(`/api/v1/public/postings/${encodeURIComponent(postingId)}`, origin), {
      cache: "no-store",
    });
    if (!response.ok) return null;
    return toPublicPosting(await response.json() as PublicPostingApiResponse);
  } catch {
    return null;
  }
}

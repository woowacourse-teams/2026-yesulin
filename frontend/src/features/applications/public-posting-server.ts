import "server-only";
import { isBackendAuditionId } from "@/features/auditions/audition-v1-api";
import { getV1PublicPostingForServer } from "./public-audition-v1";
import { publicPostingById, type PublicPosting } from "./public-posting";

/**
 * 메타데이터와 최초 SSR이 같은 공개 공고 읽기 모델을 사용한다.
 * 목 환경에서는 서버 카탈로그를, 실제 API 환경에서는 명시한 origin을 조회한다.
 */
export async function publicPostingForServer(postingId: string): Promise<PublicPosting | null> {
  const origin = process.env.API_ORIGIN;
  if (origin && isBackendAuditionId(postingId)) {
    try {
      return await getV1PublicPostingForServer(postingId, origin);
    } catch {
      return null;
    }
  }
  if (process.env.NEXT_PUBLIC_API_MOCKING !== "disabled") return publicPostingById(postingId);
  if (!origin) return null;
  try {
    const response = await fetch(new URL(`/api/public/postings/${encodeURIComponent(postingId)}`, origin), {
      cache: "no-store",
    });
    return response.ok ? response.json() as Promise<PublicPosting> : null;
  } catch {
    return null;
  }
}

import "server-only";
import { auditionPostApiPaths, type AuditionPost, type AuditionPostPage, type AuditionPostQuery } from "./types";

/**
 * 메인 목록과 상세의 최초 SSR·메타데이터용 조회. 목 환경은 브라우저 MSW만 응답하므로 null을 돌려주고
 * 화면이 클라이언트에서 다시 조회한다.
 */
async function getForServer<T>(path: string): Promise<T | null> {
  const origin = process.env.API_ORIGIN;
  if (!origin || process.env.NEXT_PUBLIC_API_MOCKING === "enabled") return null;
  try {
    const response = await fetch(new URL(path, origin), { cache: "no-store" });
    return response.ok ? response.json() as Promise<T> : null;
  } catch {
    return null;
  }
}

export function auditionPostPageForServer(query: AuditionPostQuery): Promise<AuditionPostPage | null> {
  return getForServer<AuditionPostPage>(`/api${auditionPostApiPaths.list(query)}`);
}

export function auditionPostForServer(postId: string): Promise<AuditionPost | null> {
  return getForServer<AuditionPost>(`/api${auditionPostApiPaths.detail(postId)}`);
}

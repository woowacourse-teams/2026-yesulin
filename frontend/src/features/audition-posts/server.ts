import "server-only";
import { auditionPostApiPaths, type AuditionPost, type AuditionPostPage, type AuditionPostQuery } from "./types";

const REDIRECT_COUNT_TIMEOUT_MS = 1_500;

/** 상세 SSR 조회 결과. 숨긴 공고는 백엔드가 원문 공고 주소로 302를 준다. */
export type AuditionPostLookup =
  | { readonly kind: "published"; readonly post: AuditionPost }
  | { readonly kind: "hidden"; readonly originalUrl: string };

/**
 * 메인 목록과 상세의 최초 SSR·메타데이터용 조회. 목 환경은 브라우저 MSW만 응답하므로 null을 돌려주고
 * 화면이 클라이언트에서 다시 조회한다. 숨긴 공고의 원문 이동은 따라가지 않고 주소만 읽는다.
 */
async function fetchForServer(path: string, init?: RequestInit): Promise<Response | null> {
  const origin = process.env.API_ORIGIN;
  if (!origin || process.env.NEXT_PUBLIC_API_MOCKING === "enabled") return null;
  try {
    return await fetch(new URL(path, origin), { cache: "no-store", redirect: "manual", ...init });
  } catch {
    return null;
  }
}

async function jsonOrNull<T>(response: Response | null): Promise<T | null> {
  if (!response?.ok) return null;
  try {
    return await response.json() as T;
  } catch {
    return null;
  }
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
  return jsonOrNull<AuditionPostPage>(await fetchForServer(`/api${auditionPostApiPaths.list(query)}`));
}

export async function auditionPostForServer(postId: string): Promise<AuditionPostLookup | null> {
  const response = await fetchForServer(`/api${auditionPostApiPaths.detail(postId)}`);
  const originalUrl = response?.status === 302 ? httpsLocation(response) : null;
  if (originalUrl) return { kind: "hidden", originalUrl };
  const post = await jsonOrNull<AuditionPost>(response);
  return post ? { kind: "published", post } : null;
}

/** 숨긴 공고를 원문으로 보내기 직전에 이동 수를 한 번 센다. 기록에 실패하거나 1.5초 안에 끝나지 않아도 이동은 막지 않는다. */
export async function recordAuditionPostRedirect(postId: string): Promise<void> {
  await fetchForServer(`/api${auditionPostApiPaths.redirect(postId)}`, {
    method: "POST",
    signal: AbortSignal.timeout(REDIRECT_COUNT_TIMEOUT_MS),
  });
}

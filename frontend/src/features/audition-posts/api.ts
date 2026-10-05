import { request } from "@/features/auditions/api-client";
import { auditionPostApiPaths, type AuditionPost, type AuditionPostPage, type AuditionPostQuery } from "./types";

export function getAuditionPosts(query: AuditionPostQuery): Promise<AuditionPostPage> {
  return request<AuditionPostPage>(auditionPostApiPaths.list(query));
}

/**
 * 상세를 연 탭에서 한 번만 세도록 sessionStorage에 남긴다. 요청 전에 먼저 남겨 개발 모드의 effect 두 번 실행에도 한 번만
 * 보내고, 실패하면 지운다. 저장소를 쓸 수 없으면 매번 보낸다.
 */
export async function recordAuditionPostView(postId: number): Promise<boolean> {
  const key = `yesulin:audition-post-viewed:${postId}`;
  try {
    if (sessionStorage.getItem(key)) return false;
    sessionStorage.setItem(key, "1");
  } catch {
    // 저장소를 쓸 수 없으면 그대로 센다.
  }
  try {
    await request<void>(auditionPostApiPaths.view(postId), { method: "POST" });
  } catch (cause) {
    try {
      sessionStorage.removeItem(key);
    } catch {
      // 지우지 못하면 이 탭에서는 다시 세지 않는다.
    }
    throw cause;
  }
  return true;
}

export function getAuditionPost(postId: number | string): Promise<AuditionPost> {
  return request<AuditionPost>(auditionPostApiPaths.detail(postId));
}

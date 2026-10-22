import { isAnalyticsEnabled, readAnalyticsConsent } from "@/features/analytics/consent";
import { request } from "@/features/auditions/api-client";

export const OPENCHAT_SOURCE = "kakao_openchat";
export const OPENCHAT_COUNTED_PREFIX = "yesulin:openchat-counted:v1:";
const pendingVisits = new Map<string, Promise<void>>();

export type OpenChatVisitTarget = {
  readonly kind: "post" | "otr";
  readonly id: string;
  readonly dedupKey?: string;
};

/** OTR 경유 링크와 가져온 공고 링크가 같은 브라우저 표시를 사용한다. */
export function openChatPostKey(postId: string, sourceUrl: string | null): string {
  if (sourceUrl) {
    try {
      const url = new URL(sourceUrl);
      const otrId = url.searchParams.get("vid");
      if (url.hostname === "otr.co.kr" && otrId && /^[0-9]{1,30}$/.test(otrId)) return `otr:${otrId}`;
    } catch {
      // 원문 주소를 읽지 못하면 공고 번호를 사용한다.
    }
  }
  return `post:${postId}`;
}

/** 서버에는 방문자 정보 없이 증가 요청만 보낸다. 실패하면 브라우저 표시를 지워 다음 방문에서 다시 시도한다. */
export async function recordOpenChatVisit({ kind, id, dedupKey }: OpenChatVisitTarget): Promise<void> {
  if (!isAnalyticsEnabled(readAnalyticsConsent())) return;
  const key = `${OPENCHAT_COUNTED_PREFIX}${dedupKey ?? `${kind}:${id}`}`;
  const pending = pendingVisits.get(key);
  if (pending) return pending;
  const sending = sendVisit(kind, id, key);
  pendingVisits.set(key, sending);
  try {
    await sending;
  } finally {
    pendingVisits.delete(key);
  }
}

async function sendVisit(kind: OpenChatVisitTarget["kind"], id: string, key: string): Promise<void> {
  try {
    if (window.localStorage.getItem(key)) return;
    // 요청 전에 표시해 같은 화면의 effect가 다시 실행되어도 중복 전송을 줄인다.
    window.localStorage.setItem(key, "1");
  } catch {
    // 저장할 수 없으면 반복 방문을 계속 새 방문으로 세지 않도록 집계를 생략한다.
    return;
  }
  try {
    const resource = kind === "post" ? "audition-posts" : "otr";
    await request<void>(`/v1/public/${resource}/${encodeURIComponent(id)}/openchat-visits`, {
      method: "POST",
      signal: AbortSignal.timeout(1_500),
    });
  } catch (cause) {
    try { window.localStorage.removeItem(key); } catch { /* 저장소가 차단되면 다음 방문에서도 집계하지 않는다. */ }
    throw cause;
  }
}

/** Next 라우터의 히스토리 상태와 다른 쿼리·fragment를 보존하고, 이 공고의 출처 표시만 걷어 낸다. */
export function cleanOpenChatSource(postId: string) {
  const url = new URL(window.location.href);
  if (url.pathname !== `/posts/${postId}` || url.searchParams.get("src") !== OPENCHAT_SOURCE) return;
  url.searchParams.delete("src");
  window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
}

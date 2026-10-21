import "server-only";
import { cache } from "react";
import { eventApiPaths, type EventBanner, type PublicEvent, type PublicEventSummary } from "./types";

const READ_TIMEOUT_MS = 10_000;

/** 이벤트 상세 SSR 조회 결과. 목 환경이나 서버 API가 없으면 브라우저에서 다시 읽는다. */
export type EventLookup =
  | { readonly kind: "published"; readonly event: PublicEvent }
  | { readonly kind: "missing" }
  | { readonly kind: "client-only" };

/** 목 환경은 브라우저 MSW만 응답하므로 서버 조회를 건너뛴다. */
async function fetchForServer(path: string): Promise<Response | null> {
  const origin = process.env.API_ORIGIN;
  if (!origin || process.env.NEXT_PUBLIC_API_MOCKING === "enabled") return null;
  return fetch(new URL(`/api${path}`, origin), { cache: "no-store", signal: AbortSignal.timeout(READ_TIMEOUT_MS) });
}

/** 서버에서 읽지 않으면 null이고 화면이 브라우저에서 다시 읽는다. */
export async function eventsForServer(): Promise<readonly PublicEventSummary[] | null> {
  const response = await fetchForServer(eventApiPaths.list);
  if (!response) return null;
  if (!response.ok) throw new Error(`이벤트 목록 조회 실패: ${response.status}`);
  const body = await response.json() as { readonly events: readonly PublicEventSummary[] };
  return body.events;
}

/** 메타데이터와 본문이 같은 조회 결과를 쓴다. 실제 404만 missing으로 처리한다. */
export const eventForServer = cache(async (eventId: string): Promise<EventLookup> => {
  const response = await fetchForServer(eventApiPaths.detail(eventId));
  if (!response) return { kind: "client-only" };
  if (response.status === 404) return { kind: "missing" };
  if (!response.ok) throw new Error(`이벤트 조회 실패: ${response.status}`);
  return { kind: "published", event: await response.json() as PublicEvent };
});

/** 메인 배너는 실패해도 고정 배너만으로 보여야 하므로 호출한 쪽이 실패를 null로 바꾼다. */
export async function eventBannersForServer(): Promise<readonly EventBanner[] | null> {
  const response = await fetchForServer(eventApiPaths.banners);
  if (!response) return null;
  if (!response.ok) throw new Error(`이벤트 배너 조회 실패: ${response.status}`);
  const body = await response.json() as { readonly banners: readonly EventBanner[] };
  return body.banners;
}

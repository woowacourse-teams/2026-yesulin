import { request } from "@/features/auditions/api-client";
import { eventApiPaths, type EventBanner, type PublicEvent, type PublicEventSummary } from "./types";

export async function getEvents(): Promise<readonly PublicEventSummary[]> {
  const response = await request<{ readonly events: readonly PublicEventSummary[] }>(eventApiPaths.list);
  return response.events;
}

export function getEvent(eventId: number | string): Promise<PublicEvent> {
  return request<PublicEvent>(eventApiPaths.detail(eventId));
}

export async function getEventBanners(): Promise<readonly EventBanner[]> {
  const response = await request<{ readonly banners: readonly EventBanner[] }>(eventApiPaths.banners);
  return response.banners;
}

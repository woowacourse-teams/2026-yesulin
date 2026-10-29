import { request } from "@/features/auditions/api-client";
import { safeUpload } from "@/features/files/safe-upload";
import {
  eventApiPaths,
  type EventBanner,
  type EventRegistrationPhotoUpload,
  type EventRegistrationWrite,
  type PublicEvent,
  type PublicEventSummary,
} from "./types";

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

export function registerForEvent(eventId: number | string, write: EventRegistrationWrite): Promise<{ readonly id: number }> {
  return request<{ readonly id: number }>(eventApiPaths.registrations(eventId), {
    method: "POST",
    body: JSON.stringify(write),
  });
}

/**
 * 줄인 프로필 사진을 비공개 경로로 바로 올리고 업로드 키를 준다. 신청을 보낼 때 서버가 이 키로 사진을 확정한다.
 * 로그인 없이 쓰는 화면이라 업로드 진단은 보내지 않는다.
 */
export async function uploadEventRegistrationPhoto(eventId: number | string, photo: Blob): Promise<string> {
  let uploadKey = "";
  await safeUpload({
    flow: "EVENT_IMAGE",
    source: photo,
    originalFilename: "profile-photo.jpg",
    requestUpload: async (metadata) => {
      const upload = await request<EventRegistrationPhotoUpload>(eventApiPaths.registrationPhotoUploads(eventId), {
        method: "POST",
        body: JSON.stringify({ contentType: metadata.contentType, size: metadata.size }),
      });
      uploadKey = upload.uploadKey;
      return { fileId: 0, uploadUrl: upload.url, method: upload.method, headers: upload.headers };
    },
    completeUpload: async () => {},
  });
  return uploadKey;
}

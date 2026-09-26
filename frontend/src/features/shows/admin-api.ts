import { request } from "@/features/auditions/api-client";
import type { FileUploadResource } from "@/features/auditions/backend-resources";
import { safeUpload } from "@/features/files/safe-upload";
import { reportUploadDiagnostic } from "@/features/files/upload-diagnostics";
import type {
  AdminReservation,
  AdminShow,
  AdminShowSummary,
  SaveShow,
  SaveShowSession,
} from "./types";

const ADMIN_SHOWS_PATH = "/v1/admin/shows";

const showPath = (showId: string) => `${ADMIN_SHOWS_PATH}/${encodeURIComponent(showId)}`;
const sessionPath = (showId: string, sessionId: number) => `${showPath(showId)}/sessions/${sessionId}`;

export async function getAdminShows(): Promise<readonly AdminShowSummary[]> {
  const response = await request<{ readonly shows: readonly AdminShowSummary[] }>(ADMIN_SHOWS_PATH);
  return response.shows;
}

export function getAdminShow(showId: string): Promise<AdminShow> {
  return request<AdminShow>(showPath(showId));
}

export function createShow(input: SaveShow): Promise<AdminShow> {
  return request<AdminShow>(ADMIN_SHOWS_PATH, { method: "POST", body: JSON.stringify(toShowBody(input)) });
}

export function updateShow(showId: string, input: SaveShow): Promise<AdminShow> {
  return request<AdminShow>(showPath(showId), { method: "PUT", body: JSON.stringify(toShowBody(input)) });
}

export function deleteShow(showId: string): Promise<void> {
  return request<void>(showPath(showId), { method: "DELETE" });
}

export function openShow(showId: string): Promise<AdminShow> {
  return request<AdminShow>(`${showPath(showId)}/opening`, { method: "POST" });
}

export function closeShow(showId: string): Promise<AdminShow> {
  return request<AdminShow>(`${showPath(showId)}/closing`, { method: "POST" });
}

export function createShowSession(showId: string, input: SaveShowSession): Promise<AdminShow> {
  return request<AdminShow>(`${showPath(showId)}/sessions`, { method: "POST", body: JSON.stringify(input) });
}

export function updateShowSession(showId: string, sessionId: number, input: SaveShowSession): Promise<AdminShow> {
  return request<AdminShow>(sessionPath(showId, sessionId), { method: "PUT", body: JSON.stringify(input) });
}

export function deleteShowSession(showId: string, sessionId: number): Promise<AdminShow> {
  return request<AdminShow>(sessionPath(showId, sessionId), { method: "DELETE" });
}

export async function getSessionReservations(
  showId: string,
  sessionId: number,
): Promise<readonly AdminReservation[]> {
  const response = await request<{ readonly reservations: readonly AdminReservation[] }>(
    `${sessionPath(showId, sessionId)}/reservations`,
  );
  return response.reservations;
}

export function cancelReservation(reservationId: number): Promise<AdminReservation> {
  return request<AdminReservation>(`/v1/admin/reservations/${reservationId}/cancellation`, { method: "POST" });
}

/** 포스터와 상세 이미지는 같은 운영자 업로드 API를 쓰고 공연 저장 요청에 fileId만 보낸다. */
export async function uploadShowImage(image: File): Promise<number> {
  const upload = await safeUpload({
    flow: "SHOW_IMAGE",
    source: image,
    originalFilename: image.name,
    requestUpload: (metadata, { incidentId }) => request<FileUploadResource>("/v1/admin/show-images/upload-requests", {
      method: "POST",
      headers: { "X-Request-Id": incidentId },
      body: JSON.stringify(metadata),
    }),
    completeUpload: (fileId, { incidentId }) => request<void>(`/v1/admin/show-images/${fileId}/completion`, {
      method: "PATCH",
      headers: { "X-Request-Id": incidentId },
    }),
    reportDiagnostic: reportUploadDiagnostic,
  });
  return upload.fileId;
}

function toShowBody(input: SaveShow) {
  return {
    title: input.title.trim(),
    genre: input.genre,
    description: input.description.trim(),
    venue: input.venue,
    runningMinutes: input.runningMinutes,
    ageRating: input.ageRating.trim(),
    inquiryPhone: input.inquiryPhone.trim(),
    posterFileId: input.posterFileId,
    imageFileIds: input.imageFileIds,
  };
}

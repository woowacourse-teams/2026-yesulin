import { producerRequest as request } from "@/features/auditions/api-client";
import type { FileUploadResource } from "@/features/auditions/backend-resources";
import { safeUpload } from "@/features/files/safe-upload";
import { reportUploadDiagnostic } from "@/features/files/upload-diagnostics";
import type {
  ProducerReservation,
  ProducerShow,
  ProducerShowSummary,
  SaveShow,
  SaveShowSession,
} from "./types";

/** 기획사가 자기 공연만 관리한다. 권한은 OTR 공고와 같은 Active Producer다. */
const SHOWS_PATH = "/v1/shows";

const showPath = (showId: string) => `${SHOWS_PATH}/${encodeURIComponent(showId)}`;
const sessionPath = (showId: string, sessionId: number) => `${showPath(showId)}/sessions/${sessionId}`;

export async function getProducerShows(): Promise<readonly ProducerShowSummary[]> {
  const response = await request<{ readonly shows: readonly ProducerShowSummary[] }>(SHOWS_PATH);
  return response.shows;
}

export function getProducerShow(showId: string): Promise<ProducerShow> {
  return request<ProducerShow>(showPath(showId));
}

export function createShow(input: SaveShow): Promise<ProducerShow> {
  return request<ProducerShow>(SHOWS_PATH, { method: "POST", body: JSON.stringify(toShowBody(input)) });
}

export function updateShow(showId: string, input: SaveShow): Promise<ProducerShow> {
  return request<ProducerShow>(showPath(showId), { method: "PUT", body: JSON.stringify(toShowBody(input)) });
}

export function deleteShow(showId: string): Promise<void> {
  return request<void>(showPath(showId), { method: "DELETE" });
}

export function openShow(showId: string): Promise<ProducerShow> {
  return request<ProducerShow>(`${showPath(showId)}/opening`, { method: "POST" });
}

export function closeShow(showId: string): Promise<ProducerShow> {
  return request<ProducerShow>(`${showPath(showId)}/closing`, { method: "POST" });
}

export function createShowSession(showId: string, input: SaveShowSession): Promise<ProducerShow> {
  return request<ProducerShow>(`${showPath(showId)}/sessions`, { method: "POST", body: JSON.stringify(input) });
}

export function updateShowSession(showId: string, sessionId: number, input: SaveShowSession): Promise<ProducerShow> {
  return request<ProducerShow>(sessionPath(showId, sessionId), { method: "PUT", body: JSON.stringify(input) });
}

export function deleteShowSession(showId: string, sessionId: number): Promise<ProducerShow> {
  return request<ProducerShow>(sessionPath(showId, sessionId), { method: "DELETE" });
}

export async function getSessionReservations(
  showId: string,
  sessionId: number,
): Promise<readonly ProducerReservation[]> {
  const response = await request<{ readonly reservations: readonly ProducerReservation[] }>(
    `${sessionPath(showId, sessionId)}/reservations`,
  );
  return response.reservations;
}

export function cancelReservation(reservationId: number): Promise<ProducerReservation> {
  return request<ProducerReservation>(`/v1/reservations/${reservationId}/cancellation`, { method: "POST" });
}

/** 포스터와 상세 이미지는 같은 기획사 업로드 API를 쓰고 공연 저장 요청에 fileId만 보낸다. */
export async function uploadShowImage(image: File): Promise<number> {
  const upload = await safeUpload({
    flow: "SHOW_IMAGE",
    source: image,
    originalFilename: image.name,
    requestUpload: (metadata, { incidentId }) => request<FileUploadResource>("/v1/show-images/upload-requests", {
      method: "POST",
      headers: { "X-Request-Id": incidentId },
      body: JSON.stringify(metadata),
    }),
    completeUpload: (fileId, { incidentId }) => request<void>(`/v1/show-images/${fileId}/completion`, {
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
    directionsNote: input.directionsNote.trim(),
    runningMinutes: input.runningMinutes,
    ageRating: input.ageRating.trim(),
    inquiryPhone: input.inquiryPhone.trim(),
    links: input.links.map((link) => ({ label: link.label.trim(), url: link.url.trim() })),
    remainingSeatsVisible: input.remainingSeatsVisible,
    posterFileId: input.posterFileId,
    imageFileIds: input.imageFileIds,
  };
}

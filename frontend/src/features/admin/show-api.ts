import { request } from "@/features/auditions/api-client";
import type { FileUploadResource } from "@/features/auditions/backend-resources";
import { safeUpload } from "@/features/files/safe-upload";
import { reportUploadDiagnostic } from "@/features/files/upload-diagnostics";
import type { ShowManagementApi } from "@/features/shows/management-api";
import type { ProducerShow, SaveShow, SaveShowSession } from "@/features/shows/types";

/** 운영자가 직접 등록한 외부 링크 공연을 관리한다. 오류는 기획사 화면과 같은 `AuditionRequestError`로 받는다. */
const SHOWS_PATH = "/v1/admin/shows";

const showPath = (showId: string) => `${SHOWS_PATH}/${encodeURIComponent(showId)}`;
const sessionPath = (showId: string, sessionId: number) => `${showPath(showId)}/sessions/${sessionId}`;

export const adminShowRoutes = {
  list: "/admin?tab=shows",
  detail: (showId: string) => `/admin/shows/${encodeURIComponent(showId)}`,
} as const;

function toAdminShowBody(input: SaveShow) {
  return {
    title: input.title.trim(),
    genre: input.genre,
    description: input.description.trim(),
    venue: input.venue,
    hostName: input.hostName.trim(),
    runningMinutes: input.runningMinutes,
    ageRating: input.ageRating.trim(),
    inquiryPhone: input.inquiryPhone.trim(),
    links: input.links.map((link) => ({ label: link.label.trim(), url: link.url.trim() })),
    guides: input.guides.map((guide) => ({ title: guide.title.trim(), content: guide.content.trim() })),
    externalReservationUrl: input.externalReservationUrl?.trim() ?? "",
    posterFileId: input.posterFileId,
    imageFileIds: input.imageFileIds,
  };
}

async function uploadAdminShowImage(image: File): Promise<number> {
  const upload = await safeUpload({
    flow: "SHOW_IMAGE",
    source: image,
    originalFilename: image.name,
    requestUpload: (metadata, { incidentId }) => request<FileUploadResource>(
      "/v1/admin/show-images/upload-requests",
      { method: "POST", headers: { "X-Request-Id": incidentId }, body: JSON.stringify(metadata) },
    ),
    completeUpload: (fileId, { incidentId }) => request<void>(
      `/v1/admin/show-images/${fileId}/completion`,
      { method: "PATCH", headers: { "X-Request-Id": incidentId } },
    ),
    reportDiagnostic: reportUploadDiagnostic,
  });
  return upload.fileId;
}

export const adminShowManagementApi: ShowManagementApi = {
  kind: "admin",
  listHref: adminShowRoutes.list,
  listLabel: "운영 대시보드 무료 공연",
  detailHref: adminShowRoutes.detail,
  getShow: (showId) => request<ProducerShow>(showPath(showId)),
  createShow: (input) => request<ProducerShow>(SHOWS_PATH, { method: "POST", body: JSON.stringify(toAdminShowBody(input)) }),
  updateShow: (showId, input) => request<ProducerShow>(showPath(showId), {
    method: "PUT",
    body: JSON.stringify(toAdminShowBody(input)),
  }),
  deleteShow: (showId) => request<void>(showPath(showId), { method: "DELETE" }),
  openShow: (showId) => request<ProducerShow>(`${showPath(showId)}/opening`, { method: "POST" }),
  closeShow: (showId) => request<ProducerShow>(`${showPath(showId)}/closing`, { method: "POST" }),
  // 운영자 공연은 외부 링크로 예매받아 회차에 정원이 없다. 시작 시각만 보낸다.
  createSession: (showId, input: SaveShowSession) => request<ProducerShow>(`${showPath(showId)}/sessions`, {
    method: "POST",
    body: JSON.stringify({ startsAt: input.startsAt }),
  }),
  updateSession: (showId, sessionId, input) => request<ProducerShow>(sessionPath(showId, sessionId), {
    method: "PUT",
    body: JSON.stringify({ startsAt: input.startsAt }),
  }),
  deleteSession: (showId, sessionId) => request<ProducerShow>(sessionPath(showId, sessionId), { method: "DELETE" }),
  uploadImage: uploadAdminShowImage,
};

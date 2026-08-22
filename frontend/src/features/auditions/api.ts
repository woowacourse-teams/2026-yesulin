import { AuditionRequestError, request } from "./api-client";
import type { FileUploadResource, PerformanceResource, PerformanceResourceList } from "./backend-resources";
import {
  createV1Posting,
  getV1PostingManagement,
  getV1Postings,
  getV1Roles,
  isBackendAuditionId,
  isBackendPerformanceId,
} from "./audition-v1-api";
import { getV1ScreeningBoard, getV1ScreeningSubmission, isBackendRoleId } from "./screening-v1-api";
import type {
  CloseRoundRequest,
  CreatePostingResponse,
  PerformanceId,
  PerformanceListResponse,
  PostingId,
  PostingListResponse,
  RoleId,
  RoleListResponse,
  RoundNumber,
  SaveReviewRequest,
  AuditionBoardResponse,
  AuditionTree,
  SubmissionId,
} from "./types";
import { performanceId } from "./types";
import type { CreatePerformanceRequest, CreatePostingRequest } from "./creation-types";
import type {
  PostingManagementDetail,
  ProducerProfile,
  UpdatePerformanceRequest,
  UpdatePostingRequest,
  UpdateProducerProfileRequest,
} from "./management-types";

export { AuditionRequestError } from "./api-client";

export function getAuditionTree() {
  return request<AuditionTree>("/navigation/tree");
}

export function getPerformances() {
  return request<PerformanceResourceList>("/v1/performances").then((response) => ({
    performances: response.performances.map(toPerformanceSummary),
  }));
}

export function getPostings(performance: PerformanceId) {
  if (isBackendPerformanceId(performance)) return getV1Postings(performance);
  return request<PostingListResponse>(`/performances/${performance}/postings`);
}

export function getRoles(posting: PostingId) {
  if (isBackendAuditionId(posting)) return getV1Roles(posting);
  return request<RoleListResponse>(`/postings/${posting}/roles`);
}

/** 이관된 API는 차수를 비우면 아직 차수 마감 기능이 없어 1차를 조회한다. */
export function getAuditionBoard(role: RoleId, round: RoundNumber | null) {
  if (isBackendRoleId(role)) return getV1ScreeningBoard(role, round ?? 1);
  return request<AuditionBoardResponse>(round === null ? `/screenings/roles/${role}` : `/screenings/roles/${role}?round=${round}`);
}

export async function getScreeningSubmission(role: RoleId, round: RoundNumber, submission: SubmissionId) {
  if (isBackendRoleId(role)) return getV1ScreeningSubmission(role, round, submission);
  return getAuditionBoard(role, round);
}

export async function saveReview(body: SaveReviewRequest) {
  const { roleId, round, ...review } = body;
  const path = `/v1/audition-roles/${roleId}/screening-rounds/${round}/reviews`;
  const init = {
    method: "PATCH",
    body: JSON.stringify(review),
  };
  if (!isBackendRoleId(roleId)) return request<AuditionBoardResponse>(path, init);
  await request<unknown>(path, init);
  return getV1ScreeningBoard(roleId, round);
}

export function closeRound(body: CloseRoundRequest) {
  return request<AuditionBoardResponse>("/screenings/rounds/close", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function createPerformance(body: CreatePerformanceRequest, poster: File) {
  const upload = await request<FileUploadResource>("/v1/performance-posters/upload-requests", {
    method: "POST",
    body: JSON.stringify({ originalFilename: poster.name, contentType: poster.type, size: poster.size }),
  });
  const uploadResponse = await fetch(upload.uploadUrl, {
    method: upload.method,
    headers: upload.headers,
    body: poster,
  });
  if (!uploadResponse.ok) throw new AuditionRequestError("공연 포스터를 업로드하지 못했습니다.", uploadResponse.status);
  await request<void>(`/v1/performance-posters/${upload.fileId}/completion`, { method: "PATCH" });
  return request<unknown>("/v1/performances", {
    method: "POST",
    body: JSON.stringify({
      posterFileId: upload.fileId,
      title: body.title,
      roadAddress: body.venueAddress.roadAddress,
      roles: body.roles,
    }),
  });
}

function toPerformanceSummary(resource: PerformanceResource): PerformanceListResponse["performances"][number] {
  return {
    id: performanceId(String(resource.id)),
    posterUrl: resource.posterUrl,
    title: resource.title,
    venue: resource.venue ?? resource.roadAddress,
    venueAddress: resource.venueAddress ?? {
      roadAddress: resource.roadAddress,
      detailAddress: "",
      zonecode: "",
      latitude: null,
      longitude: null,
    },
    postingCount: resource.postingCount ?? 0,
    openPostingCount: resource.openPostingCount ?? 0,
    applicantCount: resource.applicantCount ?? 0,
    pendingReviewCount: resource.pendingReviewCount ?? 0,
    postings: resource.postings ?? [],
  };
}

export function createPosting(body: CreatePostingRequest, auditionId: string) {
  if (isBackendPerformanceId(body.performanceId)) return createV1Posting(body, auditionId);
  return request<CreatePostingResponse>(`/performances/${body.performanceId}/postings`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function updatePerformance(id: PerformanceId, body: UpdatePerformanceRequest) {
  return request<PerformanceListResponse>(`/performances/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function deletePerformance(id: PerformanceId) {
  return request<void>(`/performances/${id}`, { method: "DELETE" });
}

/** Notion 명세에 아직 없는 편집 초기값 API. 화면 계약 검증을 위해 제안 형태로 둔다. */
export function getPostingManagement(id: PostingId) {
  if (isBackendAuditionId(id)) return getV1PostingManagement(id);
  return request<PostingManagementDetail>(`/postings/${id}`);
}

export function updatePosting(id: PostingId, body: UpdatePostingRequest) {
  return request<PostingListResponse>(`/postings/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function deletePosting(id: PostingId) {
  return request<void>(`/postings/${id}`, { method: "DELETE" });
}

export function getProducerProfile() {
  return request<ProducerProfile>("/me/producer");
}

export function updateProducerProfile(body: UpdateProducerProfileRequest) {
  return request<ProducerProfile>("/me/producer", { method: "PATCH", body: JSON.stringify(body) });
}

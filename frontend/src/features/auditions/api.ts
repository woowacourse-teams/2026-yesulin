import { AuditionRequestError, producerRequest as request } from "./api-client";
import type { FileUploadResource, PerformanceResource, PerformanceResourceList, ProducerProfileResource } from "./backend-resources";
import {
  createV1Posting,
  deleteV1Posting,
  getV1PostingManagement,
  getV1Postings,
  getV1Roles,
  isBackendAuditionId,
  isBackendPerformanceId,
  toManagementPostingSummary,
  updateV1Posting,
} from "./audition-v1-api";
import type {
  CompleteScreeningRequest,
  CreatePostingResponse,
  PerformanceId,
  PerformanceListResponse,
  PostingId,
  PostingListResponse,
  PostingSearchCondition,
  RoleId,
  RoleListResponse,
  RoundNumber,
  SaveReviewRequest,
  ScreeningSearchCondition,
  AuditionBoardResponse,
  AuditionTree,
} from "./types";
import { performanceId, postingId, roleId } from "./types";
import {
  getV1ScreeningBoard,
  getV1ScreeningSubmission,
  isBackendRoleId,
  toScreeningSearchParams,
} from "./screening-v1-api";
import type { CreatePerformanceRequest, CreatePostingRequest } from "./creation-types";
import type {
  PostingManagementDetail,
  PerformanceManagementDetail,
  ProducerProfile,
  UpdatePerformanceRequest,
  UpdatePostingRequest,
  UpdateProducerProfileRequest,
} from "./management-types";

export { AuditionRequestError } from "./api-client";

export function getAuditionTree(): Promise<AuditionTree> {
  return request<{
    readonly performances: readonly {
      readonly id: number;
      readonly posterUrl: string;
      readonly title: string;
      readonly postings: readonly {
        readonly id: string;
        readonly title: string;
        readonly phase: import("./types").PostingPhase;
        readonly applicantCount: number;
        readonly roleIds: readonly number[];
      }[];
    }[];
  }>("/v1/producers/me/navigation-tree").then((response): AuditionTree => ({
    performances: response.performances.map((performance) => ({
      ...performance,
      id: performanceId(String(performance.id)),
      postings: performance.postings.map((posting) => ({
        ...posting,
        id: postingId(posting.id),
        roleIds: posting.roleIds.map((id) => roleId(String(id))),
      })),
    })),
  }));
}

export function getPerformances() {
  return request<PerformanceResourceList>("/v1/performances").then((response) => ({
    performances: response.performances.map(toPerformanceSummary),
  }));
}

export function getPostings(performance: PerformanceId, condition: PostingSearchCondition = {}) {
  if (isBackendPerformanceId(performance)) return getV1Postings(performance, condition);
  const searchParams = new URLSearchParams();
  if (condition.keyword?.trim()) searchParams.set("keyword", condition.keyword.trim());
  if (condition.phase) searchParams.set("phase", condition.phase);
  const query = searchParams.size > 0 ? `?${searchParams.toString()}` : "";
  return request<PostingListResponse>(`/performances/${performance}/postings${query}`);
}

export function getRoles(posting: PostingId) {
  if (isBackendAuditionId(posting)) return getV1Roles(posting);
  return request<RoleListResponse>(`/postings/${posting}/roles`);
}

/** round를 비우면 서버가 아직 마감되지 않은 가장 이른 차수를 골라 준다. */
export function getAuditionBoard(
  role: RoleId,
  round: RoundNumber | null,
  condition: ScreeningSearchCondition = {},
) {
  if (isBackendRoleId(role)) return getV1ScreeningBoard(role, round ?? 1, condition);
  const searchParams = toScreeningSearchParams(condition);
  if (round !== null) searchParams.set("round", String(round));
  const query = searchParams.size > 0 ? `?${searchParams.toString()}` : "";
  return request<AuditionBoardResponse>(`/screenings/roles/${role}${query}`);
}

export function getAuditionSubmission(role: RoleId, round: RoundNumber, submission: import("./types").SubmissionId) {
  if (isBackendRoleId(role)) return getV1ScreeningSubmission(role, round, submission);
  return getAuditionBoard(role, round);
}

export async function saveReview(body: SaveReviewRequest, condition: ScreeningSearchCondition = {}) {
  const { roleId, round, ...review } = body;
  await request<unknown>(`/v1/audition-roles/${roleId}/screening-rounds/${round}/reviews`, {
    method: "PATCH",
    body: JSON.stringify(review),
  });
  return getAuditionBoard(roleId, round, condition);
}

export async function completeScreening(
  body: CompleteScreeningRequest,
  round: RoundNumber,
  condition: ScreeningSearchCondition = {},
) {
  await request<void>(`/v1/audition-roles/${body.roleId}/screening/completion`, {
    method: "PATCH",
  });
  return getAuditionBoard(body.roleId, round, condition);
}

export async function createPerformance(body: CreatePerformanceRequest, poster: File) {
  const posterFileId = await uploadPerformancePoster(poster);
  return request<unknown>("/v1/performances", {
    method: "POST",
    body: JSON.stringify({
      posterFileId,
      title: body.title.trim(),
      venue: body.venue.trim(),
      venueAddress: body.venueAddress,
      roles: body.roles.map((role) => ({ name: role.name.trim(), description: role.description.trim() })),
    }),
  });
}

async function uploadPerformancePoster(poster: File) {
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
  return upload.fileId;
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
    postings: resource.postings?.map(toManagementPostingSummary) ?? [],
  };
}

export function createPosting(body: CreatePostingRequest, auditionId: string) {
  if (isBackendPerformanceId(body.performanceId)) return createV1Posting(body, auditionId);
  return request<CreatePostingResponse>(`/performances/${body.performanceId}/postings`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function getPerformanceManagement(id: PerformanceId): Promise<PerformanceManagementDetail> {
  if (!isBackendPerformanceId(id)) return request<PerformanceManagementDetail>(`/performances/${id}`);
  return request<PerformanceResource>(`/v1/performances/${id}`).then(toPerformanceManagementDetail);
}

export async function updatePerformance(
  id: PerformanceId,
  body: UpdatePerformanceRequest,
  poster: File | null,
) {
  if (!isBackendPerformanceId(id)) {
    return request<PerformanceListResponse>(`/performances/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
  }
  const posterFileId = poster ? await uploadPerformancePoster(poster) : body.posterFileId;
  return request<PerformanceResource>(`/v1/performances/${id}`, {
    method: "PUT",
    body: JSON.stringify({
      posterFileId,
      title: body.title?.trim(),
      venue: body.venue?.trim(),
      venueAddress: body.venueAddress,
      roles: body.roles.map((role) => ({ name: role.name.trim(), description: role.description.trim() })),
    }),
  });
}

function toPerformanceManagementDetail(resource: PerformanceResource): PerformanceManagementDetail {
  const summary = toPerformanceSummary(resource);
  return {
    id: summary.id,
    posterFileId: resource.posterFileId,
    posterUrl: summary.posterUrl,
    title: summary.title,
    venue: summary.venue,
    venueAddress: summary.venueAddress,
    roleTemplates: resource.roles.map((role) => ({
      id: String(role.id),
      name: role.name,
      description: role.description,
    })),
  };
}

export function deletePerformance(id: PerformanceId) {
  const path = isBackendPerformanceId(id) ? `/v1/performances/${id}` : `/performances/${id}`;
  return request<void>(path, { method: "DELETE" });
}

/** Notion 명세에 아직 없는 편집 초기값 API. 화면 계약 검증을 위해 제안 형태로 둔다. */
export function getPostingManagement(id: PostingId) {
  if (isBackendAuditionId(id)) return getV1PostingManagement(id);
  return request<PostingManagementDetail>(`/postings/${id}`);
}

export async function updatePosting(id: PostingId, body: UpdatePostingRequest) {
  if (isBackendAuditionId(id)) return updateV1Posting(id, body);
  await request<PostingListResponse>(`/postings/${id}`, { method: "PATCH", body: JSON.stringify(body) });
}

export function deletePosting(id: PostingId) {
  if (isBackendAuditionId(id)) return deleteV1Posting(id);
  return request<void>(`/postings/${id}`, { method: "DELETE" });
}

export function getProducerProfile() {
  return request<ProducerProfileResource>("/v1/producers/me").then(toProducerProfile);
}

export function updateProducerProfile(body: UpdateProducerProfileRequest) {
  return request<ProducerProfileResource>("/v1/producers/me", { method: "PATCH", body: JSON.stringify(body) })
    .then(toProducerProfile);
}

function toProducerProfile(resource: ProducerProfileResource): ProducerProfile {
  return {
    companyName: resource.companyName,
    contactName: resource.contactName ?? "",
    contactRole: resource.contactRole ?? "",
    description: resource.description ?? "",
    email: resource.email,
    phone: resource.phone,
    verificationStatus: resource.verificationStatus,
  };
}

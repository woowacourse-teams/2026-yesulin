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

const API_BASE_PATH = "/api";

type PerformanceResource = {
  readonly id: number | string;
  readonly posterFileId: number;
  readonly posterUrl: string;
  readonly title: string;
  readonly roadAddress: string;
  readonly createdAt: string;
  readonly roles: readonly { readonly id: number | string; readonly name: string; readonly description: string }[];
  readonly venue?: string;
  readonly venueAddress?: CreatePerformanceRequest["venueAddress"];
  readonly postingCount?: number;
  readonly openPostingCount?: number;
  readonly applicantCount?: number;
  readonly pendingReviewCount?: number;
  readonly postings?: PerformanceListResponse["performances"][number]["postings"];
};

type PerformanceResourceList = { readonly performances: readonly PerformanceResource[] };

type FileUploadResource = {
  readonly fileId: number;
  readonly uploadUrl: string;
  readonly method: string;
  readonly expiresAt: string;
  readonly headers: Readonly<Record<string, string>>;
};

/** 서버가 내려준 메시지를 그대로 화면에 띄우기 위한 오류 타입. */
export class AuditionRequestError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(message: string, status: number, code: string | null = null) {
    super(message);
    this.name = "AuditionRequestError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_PATH}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message =
      typeof body === "object" && body !== null && "message" in body && typeof body.message === "string"
        ? body.message
        : "요청을 처리하지 못했습니다.";
    const code = typeof body === "object" && body !== null && "code" in body && typeof body.code === "string"
      ? body.code
      : null;
    throw new AuditionRequestError(message, response.status, code);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function getAuditionTree() {
  return request<AuditionTree>("/navigation/tree");
}

export function getPerformances() {
  return request<PerformanceResourceList>("/v1/performances").then((response) => ({
    performances: response.performances.map(toPerformanceSummary),
  }));
}

export function getPostings(performance: PerformanceId) {
  return request<PostingListResponse>(`/performances/${performance}/postings`);
}

export function getRoles(posting: PostingId) {
  return request<RoleListResponse>(`/postings/${posting}/roles`);
}

/** round를 비우면 서버가 아직 마감되지 않은 가장 이른 차수를 골라 준다. */
export function getAuditionBoard(role: RoleId, round: RoundNumber | null) {
  return request<AuditionBoardResponse>(round === null ? `/screenings/roles/${role}` : `/screenings/roles/${role}?round=${round}`);
}

export function saveReview(body: SaveReviewRequest) {
  const { roleId, round, ...review } = body;
  return request<AuditionBoardResponse>(`/v1/audition-roles/${roleId}/screening-rounds/${round}/reviews`, {
    method: "PATCH",
    body: JSON.stringify(review),
  });
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

export function createPosting(body: CreatePostingRequest) {
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

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
import type { CreatePerformanceRequest, CreatePostingRequest } from "./creation-types";
import type {
  PostingManagementDetail,
  ProducerProfile,
  UpdatePerformanceRequest,
  UpdatePostingRequest,
  UpdateProducerProfileRequest,
} from "./management-types";

const API_BASE_PATH = "/api";

/** 서버가 내려준 메시지를 그대로 화면에 띄우기 위한 오류 타입. */
export class AuditionRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "AuditionRequestError";
    this.status = status;
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
    throw new AuditionRequestError(message, response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export function getAuditionTree() {
  return request<AuditionTree>("/navigation/tree");
}

export function getPerformances() {
  return request<PerformanceListResponse>("/performances");
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
  return request<AuditionBoardResponse>("/screenings/reviews", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function closeRound(body: CloseRoundRequest) {
  return request<AuditionBoardResponse>("/screenings/rounds/close", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function createPerformance(body: CreatePerformanceRequest) {
  return request<PerformanceListResponse>("/performances", {
    method: "POST",
    body: JSON.stringify(body),
  });
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

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

const API_BASE_PATH = "/api/auditions";

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

  return response.json() as Promise<T>;
}

export function getAuditionTree() {
  return request<AuditionTree>("/tree");
}

export function getPerformances() {
  return request<PerformanceListResponse>("/performance");
}

export function getPostings(performance: PerformanceId) {
  return request<PostingListResponse>(`/performance/${performance}`);
}

export function getRoles(posting: PostingId) {
  return request<RoleListResponse>(`/posting/${posting}`);
}

/** round를 비우면 서버가 아직 마감되지 않은 가장 이른 차수를 골라 준다. */
export function getAuditionBoard(role: RoleId, round: RoundNumber | null) {
  return request<AuditionBoardResponse>(round === null ? `/role/${role}` : `/role/${role}?round=${round}`);
}

export function saveReview(body: SaveReviewRequest) {
  return request<AuditionBoardResponse>("/review", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function closeRound(body: CloseRoundRequest) {
  return request<AuditionBoardResponse>("/round/close", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function createPerformance(body: CreatePerformanceRequest) {
  return request<PerformanceListResponse>("/performance", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export function createPosting(body: CreatePostingRequest) {
  return request<CreatePostingResponse>("/posting", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

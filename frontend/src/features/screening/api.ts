import type {
  CloseRoundRequest,
  PerformanceId,
  PerformanceListResponse,
  PostingId,
  PostingListResponse,
  RoleId,
  RoleListResponse,
  RoundNumber,
  SaveReviewRequest,
  ScreeningBoardResponse,
  ScreeningTree,
} from "./types";

const API_BASE_PATH = "/api/screening";

/** 서버가 내려준 메시지를 그대로 화면에 띄우기 위한 오류 타입. */
export class ScreeningRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ScreeningRequestError";
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
    throw new ScreeningRequestError(message, response.status);
  }

  return response.json() as Promise<T>;
}

export function getScreeningTree() {
  return request<ScreeningTree>("/tree");
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
export function getScreeningBoard(role: RoleId, round: RoundNumber | null) {
  return request<ScreeningBoardResponse>(round === null ? `/role/${role}` : `/role/${role}?round=${round}`);
}

export function saveReview(body: SaveReviewRequest) {
  return request<ScreeningBoardResponse>("/review", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function closeRound(body: CloseRoundRequest) {
  return request<ScreeningBoardResponse>("/round/close", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

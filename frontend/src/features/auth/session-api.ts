import { ensureCsrfToken } from "../csrf";
import { authenticatedFetch } from "./unauthorized";

const API_BASE_PATH = "/api/v1";
const CSRF_HEADER_NAME = "X-CSRF-Token";

export type SessionRole = "APPLICANT" | "PRODUCER" | "ADMIN";

export type SessionStatus = "PENDING" | "ACTIVE";

export type SessionResponse = {
  readonly memberId: number;
  readonly role: SessionRole;
  readonly status: SessionStatus;
};

export class SessionApiError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(status: number, code: string | null, message: string) {
    super(message);
    this.name = "SessionApiError";
    this.status = status;
    this.code = code;
  }
}

async function toApiError(response: Response, fallbackMessage: string) {
  const payload: unknown = await response.json().catch(() => null);
  const code = typeof payload === "object" && payload !== null && "code" in payload && typeof payload.code === "string"
    ? payload.code
    : null;
  const message = typeof payload === "object" && payload !== null && "message" in payload && typeof payload.message === "string"
    ? payload.message
    : fallbackMessage;
  return new SessionApiError(response.status, code, message);
}

export async function login(email: string, password: string): Promise<SessionResponse> {
  const csrfToken = await ensureCsrfToken();
  const response = await fetch(`${API_BASE_PATH}/sessions`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {}),
    },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    throw await toApiError(response, "로그인하지 못했습니다.");
  }
  return response.json() as Promise<SessionResponse>;
}

export async function fetchCurrentSession(): Promise<SessionResponse | null> {
  const response = await fetch(`${API_BASE_PATH}/sessions/current`, {
    method: "GET",
    credentials: "include",
  });
  if (response.status === 401) return null;
  if (!response.ok) {
    throw await toApiError(response, "세션을 확인하지 못했습니다.");
  }
  return response.json() as Promise<SessionResponse>;
}

export async function logout(redirectOnUnauthorized = false): Promise<void> {
  const csrfToken = await ensureCsrfToken();
  const fetcher = redirectOnUnauthorized ? authenticatedFetch : fetch;
  const response = await fetcher(`${API_BASE_PATH}/sessions/current`, {
    method: "DELETE",
    credentials: "include",
    headers: csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {},
  });
  if (!response.ok) {
    throw await toApiError(response, "로그아웃하지 못했습니다.");
  }
}

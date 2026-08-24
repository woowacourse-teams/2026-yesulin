const API_BASE_PATH = "/api/v1";
const CSRF_COOKIE_NAME = "XSRF-TOKEN";
const CSRF_HEADER_NAME = "X-CSRF-Token";

export type SessionRole = "APPLICANT" | "PRODUCER";

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

function readCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const entry = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${CSRF_COOKIE_NAME}=`));
  return entry ? decodeURIComponent(entry.slice(CSRF_COOKIE_NAME.length + 1)) : null;
}

/**
 * 쓰기 요청에는 CSRF 토큰이 필요하다. 토큰은 서버가 쿠키로 내려주므로
 * 아직 없으면 읽기 요청을 한 번 보내 발급받는다.
 */
async function ensureCsrfToken(): Promise<string | null> {
  const cached = readCsrfToken();
  if (cached) return cached;
  await fetch(`${API_BASE_PATH}/sessions/current`, {
    method: "GET",
    credentials: "include",
  }).catch(() => null);
  return readCsrfToken();
}

/** 쓰기 요청에 CSRF 토큰 헤더를 더한다. 토큰이 없으면 먼저 발급받는다. */
export async function withCsrfHeaders(headers: Record<string, string> = {}): Promise<Record<string, string>> {
  const csrfToken = await ensureCsrfToken();
  return csrfToken ? { ...headers, [CSRF_HEADER_NAME]: csrfToken } : headers;
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

export async function logout(): Promise<void> {
  const csrfToken = await ensureCsrfToken();
  const response = await fetch(`${API_BASE_PATH}/sessions/current`, {
    method: "DELETE",
    credentials: "include",
    headers: csrfToken ? { [CSRF_HEADER_NAME]: csrfToken } : {},
  });
  if (!response.ok) {
    throw await toApiError(response, "로그아웃하지 못했습니다.");
  }
}

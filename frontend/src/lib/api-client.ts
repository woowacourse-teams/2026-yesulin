const API_BASE_PATH = "/api/v1";
const MUTATION_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

type ErrorPayload = {
  readonly code?: unknown;
  readonly message?: unknown;
  readonly detail?: unknown;
};

type CsrfPayload = {
  readonly csrfToken?: unknown;
};

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail?: unknown;

  constructor(status: number, code: string, message: string, detail?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

let csrfToken: string | null = null;
let csrfRequest: Promise<string> | null = null;

function isMutation(method?: string) {
  return MUTATION_METHODS.has((method ?? "GET").toUpperCase());
}

function apiUrl(path: string) {
  if (!path.startsWith("/")) throw new Error("API path는 /로 시작해야 합니다.");
  return `${API_BASE_PATH}${path}`;
}

async function readJson(response: Response): Promise<unknown> {
  if (response.status === 204) return undefined;
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new ApiError(response.status, "INVALID_RESPONSE", "서버 응답을 읽지 못했습니다.");
  }
}

function rememberCsrfToken(payload: unknown) {
  if (typeof payload !== "object" || payload === null) return;
  const token = (payload as CsrfPayload).csrfToken;
  if (typeof token === "string" && token.length > 0) csrfToken = token;
}

async function requestCsrfToken() {
  const response = await fetch(apiUrl("/sessions/current"), {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  });
  const payload = await readJson(response);
  if (!response.ok) throw toApiError(response.status, payload);
  rememberCsrfToken(payload);
  if (!csrfToken) throw new ApiError(500, "CSRF_TOKEN_MISSING", "CSRF 토큰을 받지 못했습니다.");
  return csrfToken;
}

async function ensureCsrfToken() {
  if (csrfToken) return csrfToken;
  if (!csrfRequest) {
    csrfRequest = requestCsrfToken().finally(() => {
      csrfRequest = null;
    });
  }
  return csrfRequest;
}

function toApiError(status: number, payload: unknown) {
  const body = typeof payload === "object" && payload !== null ? payload as ErrorPayload : null;
  const code = typeof body?.code === "string" ? body.code : `HTTP_${status}`;
  const message = typeof body?.message === "string" ? body.message : "요청을 처리하지 못했습니다.";
  return new ApiError(status, code, message, body?.detail);
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body !== undefined && init.body !== null && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  if (isMutation(init.method)) headers.set("X-CSRF-Token", await ensureCsrfToken());

  const response = await fetch(apiUrl(path), {
    ...init,
    credentials: "same-origin",
    headers,
  });
  const payload = await readJson(response);
  rememberCsrfToken(payload);
  if (!response.ok) {
    if (response.status === 403) csrfToken = null;
    throw toApiError(response.status, payload);
  }
  return payload as T;
}

export function clearApiSession() {
  csrfToken = null;
}

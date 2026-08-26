import { withCsrfHeaders } from "../csrf";
import { readErrorCode, readErrorDetail, readErrorMessage, type ApiErrorDetail } from "../api-error";
import { authenticatedFetch } from "../auth/unauthorized";

const API_BASE_PATH = "/api";
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** 서버가 내려준 메시지를 그대로 화면에 띄우기 위한 오류 타입. */
export class AuditionRequestError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly detail: ApiErrorDetail;

  constructor(
    message: string,
    status: number,
    code: string | null = null,
    detail: ApiErrorDetail = {},
  ) {
    super(message);
    this.name = "AuditionRequestError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

export function request<T>(path: string, init?: RequestInit): Promise<T> {
  return executeRequest(path, init, fetch);
}

export function producerRequest<T>(path: string, init?: RequestInit): Promise<T> {
  return executeRequest(path, init, authenticatedFetch);
}

async function executeRequest<T>(
  path: string,
  init: RequestInit | undefined,
  fetcher: typeof fetch,
): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const baseHeaders = { "Content-Type": "application/json", ...init?.headers } as Record<string, string>;
  const headers = WRITE_METHODS.has(method) ? await withCsrfHeaders(baseHeaders) : baseHeaders;
  const response = await fetcher(`${API_BASE_PATH}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const detail = readErrorDetail(body);
    throw new AuditionRequestError(readErrorMessage(body, detail), response.status, readErrorCode(body), detail);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

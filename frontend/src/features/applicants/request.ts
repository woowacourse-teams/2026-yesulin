import { withCsrfHeaders } from "@/features/csrf";
import { readErrorCode, readErrorDetail, readErrorMessage, type ApiErrorDetail } from "@/features/api-error";

const API_BASE_PATH = "/api";
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export class ApplicantRequestError extends Error {
  readonly status: number;
  readonly code?: string;
  /** 항목별 오류. 어느 입력이 왜 거부됐는지 화면이 짚어 줄 때 사용한다. */
  readonly detail: ApiErrorDetail;

  constructor(message: string, status: number, code?: string, detail: ApiErrorDetail = {}) {
    super(message);
    this.name = "ApplicantRequestError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

export async function applicantRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const baseHeaders = { "Content-Type": "application/json", ...init?.headers } as Record<string, string>;
  const headers = WRITE_METHODS.has(method) ? await withCsrfHeaders(baseHeaders) : baseHeaders;
  const response = await fetch(`${API_BASE_PATH}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const detail = readErrorDetail(body);
    throw new ApplicantRequestError(
      readErrorMessage(body, detail), response.status, readErrorCode(body) ?? undefined, detail,
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

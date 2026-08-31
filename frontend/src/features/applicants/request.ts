import { withCsrfHeaders } from "../csrf";
import { readErrorCode, readErrorDetail, readErrorMessage, type ApiErrorDetail } from "../api-error";
import { responseRequestId, withRequestId } from "../monitoring/request-id";
import { reportError } from "../monitoring/report-error";

const API_BASE_PATH = "/api";
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export class ApplicantRequestError extends Error {
  readonly status: number;
  readonly code?: string;
  /** 항목별 오류. 어느 입력이 왜 거부됐는지 화면이 짚어 줄 때 사용한다. */
  readonly detail: ApiErrorDetail;
  readonly requestId: string;

  constructor(message: string, status: number, code: string | undefined, detail: ApiErrorDetail, requestId: string) {
    super(message);
    this.name = "ApplicantRequestError";
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.requestId = requestId;
  }
}

export async function applicantRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const method = (init?.method ?? "GET").toUpperCase();
  const normalizedHeaders = new Headers(init?.headers);
  if (!normalizedHeaders.has("Content-Type")) normalizedHeaders.set("Content-Type", "application/json");
  const baseHeaders = Object.fromEntries(normalizedHeaders.entries());
  const csrfHeaders = WRITE_METHODS.has(method) ? await withCsrfHeaders(baseHeaders) : baseHeaders;
  const correlated = withRequestId(csrfHeaders);
  let response: Response;
  try {
    response = await fetch(`${API_BASE_PATH}${path}`, {
      ...init,
      credentials: "include",
      headers: correlated.headers,
    });
  } catch (cause) {
    reportError(cause, {
      feature: "api",
      operation: "request",
      requestId: correlated.requestId,
    });
    throw cause;
  }
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const detail = readErrorDetail(body);
    const error = new ApplicantRequestError(
      readErrorMessage(body, detail),
      response.status,
      readErrorCode(body) ?? undefined,
      detail,
      responseRequestId(response, correlated.requestId),
    );
    if (response.status >= 500) {
      reportError(error, {
        feature: "api",
        operation: "response",
        requestId: error.requestId,
        errorCode: error.code,
        status: error.status,
      });
    }
    throw error;
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

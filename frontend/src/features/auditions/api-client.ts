import { withCsrfHeaders } from "../csrf";
import { readErrorCode, readErrorDetail, readErrorMessage, type ApiErrorDetail } from "../api-error";
import { authenticatedFetch } from "../auth/unauthorized";
import { responseRequestId, withRequestId } from "../monitoring/request-id";
import { reportError } from "../monitoring/report-error";

const API_BASE_PATH = "/api";
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** 서버가 내려준 메시지를 그대로 화면에 띄우기 위한 오류 타입. */
export class AuditionRequestError extends Error {
  readonly status: number;
  readonly code: string | null;
  readonly detail: ApiErrorDetail;
  readonly requestId: string;

  constructor(
    message: string,
    status: number,
    requestId: string,
    code: string | null = null,
    detail: ApiErrorDetail = {},
  ) {
    super(message);
    this.name = "AuditionRequestError";
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.requestId = requestId;
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
  const csrfHeaders = WRITE_METHODS.has(method) ? await withCsrfHeaders(baseHeaders) : baseHeaders;
  const correlated = withRequestId(csrfHeaders);
  let response: Response;
  try {
    response = await fetcher(`${API_BASE_PATH}${path}`, {
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
    const error = new AuditionRequestError(
      readErrorMessage(body, detail),
      response.status,
      responseRequestId(response, correlated.requestId),
      readErrorCode(body),
      detail,
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

import { withCsrfHeaders } from "../csrf";

const API_BASE_PATH = "/api";
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** 서버가 내려준 메시지를 그대로 화면에 띄우기 위한 오류 타입. */
export class AuditionRequestError extends Error {
  readonly status: number;
  readonly code: string | null;
  /** 항목별 오류. 어느 입력이 왜 거부됐는지 화면이 짚어 줄 때 사용한다. */
  readonly detail: Readonly<Record<string, string>>;

  constructor(
    message: string,
    status: number,
    code: string | null = null,
    detail: Readonly<Record<string, string>> = {},
  ) {
    super(message);
    this.name = "AuditionRequestError";
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

function errorDetail(body: unknown): Readonly<Record<string, string>> {
  if (typeof body !== "object" || body === null || !("detail" in body)) return {};
  const detail = (body as { detail: unknown }).detail;
  if (typeof detail !== "object" || detail === null) return {};
  return Object.fromEntries(
    Object.entries(detail as Record<string, unknown>)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string" && entry[1].trim().length > 0),
  );
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
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
    const message =
      typeof body === "object" && body !== null && "message" in body && typeof body.message === "string"
        ? body.message
        : "요청을 처리하지 못했습니다.";
    const code = typeof body === "object" && body !== null && "code" in body && typeof body.code === "string"
      ? body.code
      : null;
    const detail = errorDetail(body);
    // 서버가 대표 메시지를 주지 못했을 때만 항목별 메시지로 대신 설명한다.
    const messages = Object.values(detail);
    const fallback = messages.length ? messages.join(" ") : message;
    throw new AuditionRequestError(message === "요청 값을 확인해 주세요." ? fallback : message, response.status, code, detail);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

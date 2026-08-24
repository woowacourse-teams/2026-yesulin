import { withCsrfHeaders } from "@/features/csrf";

const API_BASE_PATH = "/api";
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export class ApplicantRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApplicantRequestError";
    this.status = status;
    this.code = code;
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
    const message = typeof body === "object" && body !== null && "message" in body && typeof body.message === "string"
      ? body.message
      : "요청을 처리하지 못했습니다.";
    const code = typeof body === "object" && body !== null && "code" in body && typeof body.code === "string"
      ? body.code
      : undefined;
    throw new ApplicantRequestError(message, response.status, code);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

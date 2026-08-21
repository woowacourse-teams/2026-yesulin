const API_BASE_PATH = "/api";

/** 서버가 내려준 메시지를 그대로 화면에 띄우기 위한 오류 타입. */
export class AuditionRequestError extends Error {
  readonly status: number;
  readonly code: string | null;

  constructor(message: string, status: number, code: string | null = null) {
    super(message);
    this.name = "AuditionRequestError";
    this.status = status;
    this.code = code;
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
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
    const code = typeof body === "object" && body !== null && "code" in body && typeof body.code === "string"
      ? body.code
      : null;
    throw new AuditionRequestError(message, response.status, code);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

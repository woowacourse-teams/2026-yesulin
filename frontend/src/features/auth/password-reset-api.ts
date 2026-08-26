import { withCsrfHeaders } from "@/features/csrf";

const PASSWORD_RESET_PATH = "/api/v1/auth/password-resets";

export class PasswordResetApiError extends Error {
  readonly code: string | null;

  constructor(message: string, code: string | null) {
    super(message);
    this.name = "PasswordResetApiError";
    this.code = code;
  }
}

async function request(path: string, init: RequestInit, fallbackMessage: string) {
  const method = init.method?.toUpperCase() ?? "GET";
  const headers = method === "GET"
    ? init.headers
    : await withCsrfHeaders({ "Content-Type": "application/json" });
  const response = await fetch(path, { ...init, credentials: "include", headers });
  if (response.ok) return;

  const payload: unknown = await response.json().catch(() => null);
  const code = typeof payload === "object" && payload !== null && "code" in payload
    && typeof payload.code === "string" ? payload.code : null;
  const message = typeof payload === "object" && payload !== null && "message" in payload
    && typeof payload.message === "string" ? payload.message : fallbackMessage;
  throw new PasswordResetApiError(message, code);
}

export function sendPasswordResetMail(email: string) {
  return request(PASSWORD_RESET_PATH, {
    method: "POST",
    body: JSON.stringify({ email }),
  }, "비밀번호 재설정 메일을 보내지 못했습니다.");
}

export function validatePasswordResetToken(token: string) {
  const searchParams = new URLSearchParams({ token });
  return request(`${PASSWORD_RESET_PATH}?${searchParams.toString()}`, {
    method: "GET",
  }, "비밀번호 재설정 링크를 확인하지 못했습니다.");
}

export function resetPassword(token: string, password: string, passwordConfirm: string) {
  return request(PASSWORD_RESET_PATH, {
    method: "PATCH",
    body: JSON.stringify({ token, password, passwordConfirm }),
  }, "비밀번호를 변경하지 못했습니다.");
}

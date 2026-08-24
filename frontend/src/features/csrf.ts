const API_BASE_PATH = "/api/v1";
const CSRF_COOKIE_NAME = "XSRF-TOKEN";
const CSRF_HEADER_NAME = "X-CSRF-Token";

function readCsrfToken(): string | null {
  if (typeof document === "undefined") return null;
  const entry = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${CSRF_COOKIE_NAME}=`));
  return entry ? decodeURIComponent(entry.slice(CSRF_COOKIE_NAME.length + 1)) : null;
}

/** 서버가 CSRF 쿠키를 아직 발급하지 않았다면 안전한 읽기 요청으로 먼저 발급받는다. */
export async function ensureCsrfToken(): Promise<string | null> {
  const cached = readCsrfToken();
  if (cached) return cached;
  await fetch(`${API_BASE_PATH}/sessions/current`, {
    method: "GET",
    credentials: "include",
  }).catch(() => null);
  return readCsrfToken();
}

/** 쓰기 요청 헤더에 서버가 요구하는 CSRF 토큰을 추가한다. */
export async function withCsrfHeaders(headers: Record<string, string> = {}): Promise<Record<string, string>> {
  const csrfToken = await ensureCsrfToken();
  return csrfToken ? { ...headers, [CSRF_HEADER_NAME]: csrfToken } : headers;
}

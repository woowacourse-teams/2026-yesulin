import assert from "node:assert/strict";
import test from "node:test";
import { apiRequest, ApiError, clearApiSession } from "./api-client.ts";

test("쓰기 요청 전에 CSRF를 조회하고 같은 origin 세션으로 전송한다", async () => {
  clearApiSession();
  const requests: { readonly input: string; readonly init?: RequestInit }[] = [];
  globalThis.fetch = async (input, init) => {
    requests.push({ input: String(input), init });
    if (requests.length === 1) {
      return Response.json({ authenticated: false, csrfToken: "csrf-test" });
    }
    return Response.json({ ok: true });
  };

  await apiRequest("/resource", { method: "POST", body: JSON.stringify({ value: 1 }) });

  assert.equal(requests[0]?.input, "/api/v1/sessions/current");
  assert.equal(requests[0]?.init?.credentials, "same-origin");
  assert.equal(requests[1]?.input, "/api/v1/resource");
  assert.equal(requests[1]?.init?.credentials, "same-origin");
  assert.equal(new Headers(requests[1]?.init?.headers).get("X-CSRF-Token"), "csrf-test");
});

test("공통 오류 응답을 ApiError로 변환한다", async () => {
  globalThis.fetch = async () => Response.json(
    { code: "AUTHENTICATION_REQUIRED", message: "로그인이 필요합니다.", detail: null },
    { status: 401 },
  );

  await assert.rejects(
    () => apiRequest("/protected"),
    (error: unknown) => error instanceof ApiError
      && error.status === 401
      && error.code === "AUTHENTICATION_REQUIRED",
  );
});

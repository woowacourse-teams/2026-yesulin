import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { setupServer } from "msw/node";

vi.mock("@/config/environment", () => ({ frontendEnvironment: {} }));
let worker: ReturnType<typeof setupServer>;
const origin = "http://auth.test";

beforeEach(async () => {
  vi.resetModules();
  vi.stubGlobal("location", new URL(origin));
  const { authHandlers } = await import("./auth-handlers");
  worker = setupServer(...authHandlers);
  worker.listen({ onUnhandledRequest: "error" });
});
afterEach(() => { worker.close(); vi.unstubAllGlobals(); });

it("ADMIN의 인증번호 검증은 실제 서버처럼 AUTH_FORBIDDEN이다", async () => {
  // given
  await fetch(`${origin}/api/v1/sessions`, {
    method: "POST", body: JSON.stringify({ email: "admin@example.test", password: "password123" }),
  });
  // when
  const response = await fetch(`${origin}/api/v1/auth/email-verifications`, {
    method: "PATCH", body: JSON.stringify({ code: "123456" }),
  });
  // then
  expect(response.status).toBe(403);
  expect(await response.json()).toMatchObject({ code: "AUTH_FORBIDDEN" });
});

it("목 가입 후 코드 인증도 현재 세션과 다음 로그인에 ACTIVE를 유지한다", async () => {
  // given
  const credentials = { email: "producer@example.test", password: "password123" };
  await fetch(`${origin}/api/v1/producers`, { method: "POST", body: JSON.stringify({
    ...credentials, passwordConfirm: credentials.password, companyName: "목 극단", phone: "01012345678", termsAgreed: true,
  }) });
  await fetch(`${origin}/api/v1/sessions`, { method: "POST", body: JSON.stringify(credentials) });
  // when
  const verified = await fetch(`${origin}/api/v1/auth/email-verifications`, {
    method: "PATCH", body: JSON.stringify({ code: "123456" }),
  });
  // then
  expect(await verified.json()).toMatchObject({ role: "PRODUCER", status: "ACTIVE" });
  const current = await fetch(`${origin}/api/v1/sessions/current`);
  expect(await current.json()).toMatchObject({ status: "ACTIVE" });
  const login = await fetch(`${origin}/api/v1/sessions`, { method: "POST", body: JSON.stringify(credentials) });
  expect(await login.json()).toMatchObject({ status: "ACTIVE" });
});

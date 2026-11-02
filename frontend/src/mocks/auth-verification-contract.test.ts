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

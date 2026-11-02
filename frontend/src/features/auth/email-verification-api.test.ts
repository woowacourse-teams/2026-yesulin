import { afterEach, expect, it, vi } from "vitest";
import { verifyProducerEmailCode } from "./api";

vi.mock("../csrf", () => ({ withCsrfHeaders: async (headers: Record<string, string>) => ({ ...headers, "X-CSRF-Token": "csrf" }) }));
afterEach(() => vi.unstubAllGlobals());

it("인증번호의 선행 0을 보존하고 본인 세션과 CSRF로 PATCH한다", async () => {
  // given
  const fetch = vi.fn().mockResolvedValue(Response.json({ memberId: 10, role: "PRODUCER", status: "ACTIVE" }));
  vi.stubGlobal("fetch", fetch);
  // when
  const session = await verifyProducerEmailCode("000123");
  // then
  expect(fetch).toHaveBeenCalledWith("/api/v1/auth/email-verifications", expect.objectContaining({
    method: "PATCH", credentials: "include", body: JSON.stringify({ code: "000123" }),
    headers: { "Content-Type": "application/json", "X-CSRF-Token": "csrf" },
  }));
  expect(session.status).toBe("ACTIVE");
});

it("서버가 검증을 거절하면 오류 안내를 전달한다", async () => {
  // given
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
    code: "AUTH_EMAIL_VERIFICATION_ATTEMPTS_EXCEEDED", message: "새 인증번호를 요청해 주세요.",
  }, { status: 409 })));
  // when, then
  await expect(verifyProducerEmailCode("999999")).rejects.toThrow("새 인증번호를 요청해 주세요.");
});

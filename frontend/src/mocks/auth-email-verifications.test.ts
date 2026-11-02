import { afterEach, expect, it, vi } from "vitest";
import { issueMockEmailVerification, verifyMockEmailCode } from "./auth-email-verifications";

afterEach(() => vi.useRealTimers());

it("발급 간격과 만료, 실패 횟수를 서버 계약처럼 검사한다", () => {
  // given
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-11-02T00:00:00Z"));
  const email = "limits@example.test";
  expect(issueMockEmailVerification(email)).toBeNull();
  // when, then
  expect(issueMockEmailVerification(email)?.code).toBe("AUTH_EMAIL_VERIFICATION_RESEND_TOO_SOON");
  for (let attempt = 0; attempt < 4; attempt++) expect(verifyMockEmailCode(email, "000000")?.status).toBe(400);
  expect(verifyMockEmailCode(email, "000000")?.code).toBe("AUTH_EMAIL_VERIFICATION_ATTEMPTS_EXCEEDED");
  vi.advanceTimersByTime(60_000);
  expect(issueMockEmailVerification(email)).toBeNull();
  vi.advanceTimersByTime(300_000);
  expect(verifyMockEmailCode(email, "123456")?.code).toBe("AUTH_EXPIRED_EMAIL_VERIFICATION");
});

import { delay, http, HttpResponse, passthrough } from "msw";
import { frontendEnvironment } from "@/config/environment";
import type { ProducerSignupRequest } from "@/features/auth/api";
import { registerPendingProducer } from "./auditions/producer-profile";

const emails = new Set<string>();
const pendingProducerEmails = new Set<string>();
let mockSession: { memberId: number; role: "APPLICANT" | "PRODUCER"; status: "PENDING" | "ACTIVE" } | null = null;
const realProducerLoginEnabled = frontendEnvironment.producerLoginEnabled;
const realSocialLoginEnabled = frontendEnvironment.socialLoginEnabled;
const MOCK_PASSWORD_RESET_TOKEN = "mock-password-reset-token";
let mockPasswordResetAvailable = true;
const error = (code: string, message: string, status = 400) => HttpResponse.json({ code, message }, { status });
const validationError = (field: string, message: string) => HttpResponse.json({
  code: "INVALID_REQUEST",
  message,
  detail: { [field]: message },
}, { status: 400 });

function isRequestBody(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const authHandlers = [
  http.post("/api/v1/sessions", async ({ request }) => {
    if (realProducerLoginEnabled) return passthrough();
    await delay(240);
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    if (!/^\S+@\S+\.\S+$/.test(email) || !body.password) {
      return error("INVALID_REQUEST", "요청 값을 확인해 주세요.");
    }
    mockSession = {
      memberId: 1,
      role: "PRODUCER",
      status: pendingProducerEmails.has(email) ? "PENDING" : "ACTIVE",
    };
    return HttpResponse.json(mockSession);
  }),

  http.get("/api/v1/sessions/current", () => {
    if (realProducerLoginEnabled || realSocialLoginEnabled) return passthrough();
    if (!mockSession) {
      return error("AUTH_UNAUTHENTICATED", "로그인이 필요합니다.", 401);
    }
    return HttpResponse.json(mockSession);
  }),

  http.delete("/api/v1/sessions/current", () => {
    if (realProducerLoginEnabled || realSocialLoginEnabled) return passthrough();
    mockSession = null;
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/v1/auth/email-verifications", async () => {
    if (realProducerLoginEnabled) return passthrough();
    await delay(320);
    if (!mockSession) return error("AUTH_UNAUTHENTICATED", "로그인이 필요합니다.", 401);
    if (mockSession.role !== "PRODUCER" || mockSession.status !== "PENDING") {
      return error("AUTH_INACTIVE_MEMBER", "이메일 인증 대기 계정만 재전송할 수 있습니다.", 403);
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/v1/auth/password-resets", async ({ request }) => {
    if (realProducerLoginEnabled) return passthrough();
    await delay(320);
    const body: unknown = await request.json().catch(() => null);
    if (!isRequestBody(body)) {
      return validationError("request", "요청 형식이 올바르지 않습니다. 입력한 값을 다시 확인해 주세요.");
    }
    const email = typeof body.email === "string" ? body.email : "";
    if (!email.trim() || email.length > 320 || !/^\S+@\S+\.\S+$/.test(email)) {
      return validationError("email", "올바른 이메일 주소를 입력해 주세요.");
    }
    mockPasswordResetAvailable = true;
    return new HttpResponse(null, { status: 204 });
  }),

  http.get("/api/v1/auth/password-resets", async ({ request }) => {
    if (realProducerLoginEnabled) return passthrough();
    await delay(240);
    const token = new URL(request.url).searchParams.get("token");
    if (token !== MOCK_PASSWORD_RESET_TOKEN || !mockPasswordResetAvailable) {
      return error("AUTH_INVALID_PASSWORD_RESET", "비밀번호 재설정 링크가 유효하지 않습니다.");
    }
    return new HttpResponse(null, { status: 204 });
  }),

  http.patch("/api/v1/auth/password-resets", async ({ request }) => {
    if (realProducerLoginEnabled) return passthrough();
    await delay(320);
    const body: unknown = await request.json().catch(() => null);
    if (!isRequestBody(body)) {
      return validationError("request", "요청 형식이 올바르지 않습니다. 입력한 값을 다시 확인해 주세요.");
    }
    const token = typeof body.token === "string" ? body.token : "";
    const password = typeof body.password === "string" ? body.password : "";
    const passwordConfirm = typeof body.passwordConfirm === "string" ? body.passwordConfirm : "";
    if (!token.trim() || token.length > 512) {
      return validationError("token", "유효한 비밀번호 재설정 토큰이 필요합니다.");
    }
    if (!password.trim() || password.length < 8 || password.length > 64) {
      return validationError("password", "비밀번호는 8자 이상 64자 이하로 입력해 주세요.");
    }
    if (!passwordConfirm.trim()) {
      return validationError("passwordConfirm", "비밀번호 확인 값이 필요합니다.");
    }
    if (password !== passwordConfirm) {
      return validationError("passwordConfirm", "비밀번호가 일치하지 않습니다.");
    }
    if (token !== MOCK_PASSWORD_RESET_TOKEN || !mockPasswordResetAvailable) {
      return error("AUTH_INVALID_PASSWORD_RESET", "비밀번호 재설정 링크가 유효하지 않습니다.");
    }
    mockPasswordResetAvailable = false;
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/v1/producers", async ({ request }) => {
    if (realProducerLoginEnabled) return passthrough();
    await delay(320);
    const body = (await request.json()) as ProducerSignupRequest;
    const email = body.email?.trim().toLowerCase();
    const phone = body.phone?.replace(/\D/g, "");
    if (!body.companyName?.trim()) return error("COMPANY_REQUIRED", "기획사/제작사명을 입력해 주세요.");
    if (!/^01\d{8,9}$/.test(phone)) return error("INVALID_PHONE", "올바른 휴대폰 번호를 입력해 주세요.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return error("INVALID_EMAIL", "올바른 이메일 주소를 입력해 주세요.");
    if (body.password?.length < 8) return error("PASSWORD_TOO_SHORT", "비밀번호는 8자 이상 입력해 주세요.");
    if (body.password !== body.passwordConfirm) return error("PASSWORD_MISMATCH", "비밀번호가 일치하지 않습니다.");
    if (!body.termsAgreed) return error("TERMS_REQUIRED", "필수 약관에 동의해 주세요.");
    if (emails.has(email)) return error("EMAIL_ALREADY_EXISTS", "이미 가입된 이메일입니다.", 409);
    emails.add(email);
    pendingProducerEmails.add(email);
    registerPendingProducer({ companyName: body.companyName, email, phone });
    return HttpResponse.json({
      memberId: 1,
      companyName: body.companyName.trim(),
      email,
      role: "PRODUCER",
      verificationStatus: "PENDING",
    }, { status: 201 });
  }),
];

import { delay, http, HttpResponse } from "msw";
import type { ProducerSignupRequest } from "@/features/auth/api";
import { registerPendingProducer } from "./auditions/producer-profile";

const emails = new Set<string>();
let mockSession: { memberId: number; role: "APPLICANT" | "PRODUCER" } | null = null;
const error = (code: string, message: string, status = 400) => HttpResponse.json({ code, message }, { status });

export const authHandlers = [
  http.post("/api/v1/sessions", async ({ request }) => {
    await delay(240);
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    if (!/^\S+@\S+\.\S+$/.test(email) || !body.password) {
      return error("INVALID_REQUEST", "요청 값을 확인해 주세요.");
    }
    mockSession = { memberId: 1, role: "PRODUCER" };
    return HttpResponse.json(mockSession);
  }),

  http.get("/api/v1/sessions/current", () => {
    if (!mockSession) {
      return error("AUTH_UNAUTHENTICATED", "로그인이 필요합니다.", 401);
    }
    return HttpResponse.json(mockSession);
  }),

  http.delete("/api/v1/sessions/current", () => {
    mockSession = null;
    return new HttpResponse(null, { status: 204 });
  }),

  http.post("/api/v1/producers", async ({ request }) => {
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

import { delay, http, HttpResponse } from "msw";
import type { ApplicantSignupRequest } from "@/features/auth/api";
import { claimApplicantApplication } from "./applicants/store";

const emails = new Set<string>();
const error = (code: string, message: string, status = 400) => HttpResponse.json({ code, message }, { status });

export const authHandlers = [
  http.post("/api/auth/signup/applicant", async ({ request }) => {
    await delay(320);
    const body = (await request.json()) as ApplicantSignupRequest;
    const email = body.email?.trim().toLowerCase();
    if (!body.name?.trim()) return error("NAME_REQUIRED", "이름을 입력해 주세요.");
    if (!/^\S+@\S+\.\S+$/.test(email)) return error("INVALID_EMAIL", "올바른 이메일 주소를 입력해 주세요.");
    if (body.password?.length < 8) return error("PASSWORD_TOO_SHORT", "비밀번호는 8자 이상 입력해 주세요.");
    if (body.password !== body.passwordConfirm) return error("PASSWORD_MISMATCH", "비밀번호가 일치하지 않습니다.");
    if (!body.termsAgreed) return error("TERMS_REQUIRED", "필수 약관에 동의해 주세요.");
    if (emails.has(email)) return error("EMAIL_ALREADY_EXISTS", "이미 가입된 이메일입니다.", 409);
    emails.add(email);
    const claimedApplicationId = claimApplicantApplication(body.profileClaimToken);
    return HttpResponse.json({
      role: "APPLICANT",
      name: body.name.trim(),
      verificationStatus: null,
      profileClaimed: claimedApplicationId !== null,
      claimedApplicationId,
      redirectTo: "/applicants",
    }, { status: 201 });
  }),
];

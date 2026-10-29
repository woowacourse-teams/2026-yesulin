import { http, HttpResponse, passthrough } from "msw";
import { frontendEnvironment } from "@/config/environment";
import { mockSessionRole } from "./auth-handlers";

export const realMemberLinkEnabled = frontendEnvironment.producerLoginEnabled
  || frontendEnvironment.socialLoginEnabled || frontendEnvironment.applicantProfileApiEnabled;
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MOCK_APPLICANT_ID = 3001;
let current: { code: string; expiresAt: number; issuedAt: number; used: boolean } | null = null;
export const invalidMemberLinkCode = () => HttpResponse.json({ code: "MEMBER_LINK_CODE_INVALID",
  message: "코드가 올바르지 않거나 만료·사용되었습니다. 배우에게 새 코드를 받아 주세요." }, { status: 400 });

export function consumeMockMemberLinkCode(value: string): number | null {
  const normalized = value.replace(/[ -]/g, "").toUpperCase();
  if (!current || current.code !== normalized || current.used || Date.now() >= current.expiresAt) return null;
  current.used = true;
  return MOCK_APPLICANT_ID;
}

export const memberLinkCodeHandlers = [
  http.post("/api/v1/applicants/me/member-link-code", () => {
    if (realMemberLinkEnabled) return passthrough();
    const role = mockSessionRole();
    if (role && role !== "APPLICANT") return HttpResponse.json({ code: "AUTH_FORBIDDEN", message: "배우 계정으로 로그인해 주세요." }, { status: 403 });
    const now = Date.now();
    if (current && now < current.issuedAt + 30_000) return HttpResponse.json({ code: "MEMBER_LINK_CODE_COOLDOWN", message: "코드는 발급 후 30초가 지나면 다시 받을 수 있습니다." }, { status: 409 });
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    const code = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
    current = { code, issuedAt: now, expiresAt: now + 600_000, used: false };
    return HttpResponse.json({ code: `${code.slice(0, 4)}-${code.slice(4)}`, expiresAt: new Date(current.expiresAt).toISOString(), reissueAvailableAt: new Date(now + 30_000).toISOString(), expiresInSeconds: 600, reissueAfterSeconds: 30 }, { headers: { "Cache-Control": "no-store" } });
  }),
];

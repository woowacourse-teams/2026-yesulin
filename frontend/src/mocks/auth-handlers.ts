import { delay, http, HttpResponse } from "msw";
import type {
  ApplicantRegistrationRequest,
  LoginRequest,
  ProducerRegistrationRequest,
  SessionResponse,
} from "@/features/auth/api";

type MockAccount = {
  readonly accountId: number;
  readonly email: string;
  readonly password: string;
  readonly applicantId: number | null;
  readonly companyIds: readonly number[];
};

const csrfToken = "mock-csrf-token";
const accounts = new Map<string, MockAccount>();
let nextAccountId = 1;
let nextApplicantId = 1;
let nextCompanyId = 1;
let authenticatedEmail: string | null = null;
let activeCompanyId: number | null = null;

function error(status: number, code: string, message: string, detail: unknown = null) {
  return HttpResponse.json({ code, message, detail }, { status });
}

function requireCsrf(request: Request) {
  return request.headers.get("X-CSRF-Token") === csrfToken;
}

export function mockRequestAuthorized(request: Request) {
  const authenticationError = mockAuthenticationError();
  if (authenticationError) return authenticationError;
  if (!requireCsrf(request)) return error(403, "CSRF_TOKEN_INVALID", "CSRF 토큰이 없거나 올바르지 않습니다.");
  return null;
}

export function mockAuthenticationError() {
  return authenticatedEmail ? null : error(401, "AUTHENTICATION_REQUIRED", "로그인이 필요합니다.");
}

function sessionResponse(): SessionResponse {
  const account = authenticatedEmail ? accounts.get(authenticatedEmail) : null;
  return {
    authenticated: account !== undefined && account !== null,
    accountId: account?.accountId ?? null,
    email: account?.email ?? null,
    activeCompanyId: account ? activeCompanyId : null,
    csrfToken,
  };
}

export const authHandlers = [
  http.get("/api/v1/sessions/current", async () => {
    await delay(80);
    return HttpResponse.json(sessionResponse());
  }),

  http.post("/api/v1/sessions", async ({ request }) => {
    await delay(180);
    if (!requireCsrf(request)) return error(403, "CSRF_TOKEN_INVALID", "CSRF 토큰이 없거나 올바르지 않습니다.");
    const body = (await request.json()) as LoginRequest;
    const email = body.email?.trim().toLowerCase();
    const account = accounts.get(email);
    if (!account || account.password !== body.password) {
      return error(401, "INVALID_CREDENTIALS", "이메일 또는 비밀번호가 올바르지 않습니다.");
    }
    authenticatedEmail = email;
    activeCompanyId = account.companyIds.length === 1 ? account.companyIds[0] : null;
    return HttpResponse.json(sessionResponse());
  }),

  http.delete("/api/v1/sessions/current", async ({ request }) => {
    await delay(80);
    if (!requireCsrf(request)) return error(403, "CSRF_TOKEN_INVALID", "CSRF 토큰이 없거나 올바르지 않습니다.");
    if (!authenticatedEmail) return error(401, "AUTHENTICATION_REQUIRED", "로그인이 필요합니다.");
    authenticatedEmail = null;
    activeCompanyId = null;
    return new HttpResponse(null, { status: 204 });
  }),

  http.put("/api/v1/sessions/current/active-company", async ({ request }) => {
    await delay(100);
    if (!requireCsrf(request)) return error(403, "CSRF_TOKEN_INVALID", "CSRF 토큰이 없거나 올바르지 않습니다.");
    const account = authenticatedEmail ? accounts.get(authenticatedEmail) : null;
    if (!account) return error(401, "AUTHENTICATION_REQUIRED", "로그인이 필요합니다.");
    const body = (await request.json()) as { readonly companyId?: number };
    if (!body.companyId || !account.companyIds.includes(body.companyId)) {
      return error(403, "COMPANY_ACCESS_DENIED", "소속된 공연사만 활성 공연사로 선택할 수 있습니다.");
    }
    activeCompanyId = body.companyId;
    return HttpResponse.json(sessionResponse());
  }),

  http.post("/api/v1/applicants", async ({ request }) => {
    await delay(220);
    if (!requireCsrf(request)) return error(403, "CSRF_TOKEN_INVALID", "CSRF 토큰이 없거나 올바르지 않습니다.");
    const body = (await request.json()) as ApplicantRegistrationRequest;
    const email = body.email?.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email)) return error(400, "INVALID_REQUEST", "요청 값이 올바르지 않습니다.", { email: "올바른 이메일 주소여야 합니다." });
    if ((body.password?.length ?? 0) < 8) return error(400, "INVALID_REQUEST", "요청 값이 올바르지 않습니다.", { password: "크기가 8에서 72 사이여야 합니다." });
    const existing = accounts.get(email);
    if (existing && (existing.password !== body.password || existing.applicantId !== null)) return error(409, "ACCOUNT_ALREADY_EXISTS", "이미 가입된 이메일입니다.");
    const accountId = existing?.accountId ?? nextAccountId++;
    const applicantId = nextApplicantId++;
    accounts.set(email, { accountId, applicantId, email, password: body.password, companyIds: existing?.companyIds ?? [] });
    return HttpResponse.json({ accountId, applicantId, email }, { status: 201 });
  }),

  http.post("/api/v1/producers", async ({ request }) => {
    await delay(240);
    if (!requireCsrf(request)) return error(403, "CSRF_TOKEN_INVALID", "CSRF 토큰이 없거나 올바르지 않습니다.");
    const body = (await request.json()) as ProducerRegistrationRequest;
    const email = body.email?.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(email) || !body.companyName?.trim() || !body.contactName?.trim()) {
      return error(400, "INVALID_REQUEST", "요청 값이 올바르지 않습니다.");
    }
    if ((body.password?.length ?? 0) < 8) return error(400, "INVALID_REQUEST", "요청 값이 올바르지 않습니다.");
    const existing = accounts.get(email);
    if (existing && existing.password !== body.password) return error(409, "ACCOUNT_ALREADY_EXISTS", "이미 가입된 이메일입니다.");
    const accountId = existing?.accountId ?? nextAccountId++;
    const companyId = nextCompanyId++;
    accounts.set(email, { accountId, applicantId: existing?.applicantId ?? null, email, password: body.password, companyIds: [...(existing?.companyIds ?? []), companyId] });
    return HttpResponse.json({ accountId, companyId, email, verificationStatus: "PENDING" }, { status: 201 });
  }),
];

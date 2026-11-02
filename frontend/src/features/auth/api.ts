import { withCsrfHeaders } from "../csrf";
import { authenticatedFetch } from "./unauthorized";
import type { SessionResponse } from "./session-api";

const API_BASE_PATH = "/api/v1";

export type ProducerSignupRequest = {
  readonly companyName: string;
  readonly phone: string;
  readonly email: string;
  readonly password: string;
  readonly passwordConfirm: string;
  readonly termsAgreed: boolean;
};

export type ProducerSignupResponse = {
  readonly memberId: number;
  readonly companyName: string;
  readonly email: string;
  readonly role: "PRODUCER";
  readonly verificationStatus: "PENDING" | "ACTIVE";
};

export async function signupProducer(body: ProducerSignupRequest): Promise<ProducerSignupResponse> {
  const response = await fetch(`${API_BASE_PATH}/producers`, {
    method: "POST",
    credentials: "include",
    headers: await withCsrfHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const message = typeof payload === "object" && payload !== null && "message" in payload && typeof payload.message === "string"
      ? payload.message
      : "기획사/제작사 계정을 만들지 못했습니다.";
    throw new Error(message);
  }
  return response.json() as Promise<ProducerSignupResponse>;
}

export async function resendProducerVerificationEmail(): Promise<void> {
  const response = await authenticatedFetch(`${API_BASE_PATH}/auth/email-verifications`, await verificationOptions());
  await ensureVerificationSucceeded(response);
}

export async function verifyProducerEmailCode(code: string): Promise<SessionResponse> {
  const response = await authenticatedFetch(`${API_BASE_PATH}/auth/email-verifications`, await verificationOptions(code));
  await ensureVerificationSucceeded(response);
  return response.json() as Promise<SessionResponse>;
}

async function verificationOptions(code?: string): Promise<RequestInit> {
  const headers = await withCsrfHeaders({ "Content-Type": "application/json" });
  const options: RequestInit = { method: "POST", credentials: "include", headers };
  if (code === undefined) return options;
  return { ...options, method: "PATCH", body: JSON.stringify({ code }) };
}

async function ensureVerificationSucceeded(response: Response) {
  if (response.ok) return;
  const payload: unknown = await response.json().catch(() => null);
  if (typeof payload === "object" && payload !== null && "message" in payload && typeof payload.message === "string") {
    throw new Error(payload.message);
  }
  throw new Error("이메일 인증을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
}

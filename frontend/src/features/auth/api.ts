import { withCsrfHeaders } from "../csrf";

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
  const response = await fetch(`${API_BASE_PATH}/auth/email-verifications`, {
    method: "POST",
    credentials: "include",
    headers: await withCsrfHeaders(),
  });
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const message = typeof payload === "object" && payload !== null && "message" in payload && typeof payload.message === "string"
      ? payload.message
      : "인증 이메일을 재전송하지 못했습니다.";
    throw new Error(message);
  }
}

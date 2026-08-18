const API_BASE_PATH = "/api";

export type ProducerSignupRequest = {
  readonly companyName: string;
  readonly phone: string;
  readonly email: string;
  readonly password: string;
  readonly passwordConfirm: string;
  readonly termsAgreed: boolean;
};

export type ProducerSignupResponse = {
  readonly role: "PRODUCER";
  readonly companyName: string;
  readonly verificationStatus: "PENDING";
  readonly credential: string;
  readonly redirectTo: string;
};

export async function signupProducer(body: ProducerSignupRequest): Promise<ProducerSignupResponse> {
  const response = await fetch(`${API_BASE_PATH}/auth/signup/producer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
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

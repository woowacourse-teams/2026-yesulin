import type { ApplicationId } from "@/features/auditions/types";

const API_BASE_PATH = "/api";

export type ApplicantSignupRequest = {
  readonly name: string;
  readonly email: string;
  readonly password: string;
  readonly passwordConfirm: string;
  readonly termsAgreed: boolean;
  readonly profileClaimToken?: string;
};

export type ApplicantSignupResponse = {
  readonly role: "APPLICANT";
  readonly name: string;
  readonly verificationStatus: null;
  readonly profileClaimed: boolean;
  readonly claimedApplicationId: ApplicationId | null;
  readonly redirectTo: string;
};

export async function signupApplicant(body: ApplicantSignupRequest): Promise<ApplicantSignupResponse> {
  const response = await fetch(`${API_BASE_PATH}/auth/signup/applicant`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const payload: unknown = await response.json().catch(() => null);
    const message = typeof payload === "object" && payload !== null && "message" in payload && typeof payload.message === "string" ? payload.message : "계정을 만들지 못했습니다.";
    throw new Error(message);
  }
  return response.json() as Promise<ApplicantSignupResponse>;
}

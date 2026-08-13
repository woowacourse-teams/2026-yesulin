import { apiRequest, clearApiSession } from "@/lib/api-client";

export type SessionResponse = {
  readonly authenticated: boolean;
  readonly accountId: number | null;
  readonly email: string | null;
  readonly activeCompanyId: number | null;
  readonly csrfToken: string;
};

export type ApplicantRegistrationRequest = {
  readonly email: string;
  readonly password: string;
};

export type ApplicantRegistrationResponse = {
  readonly accountId: number;
  readonly applicantId: number;
  readonly email: string;
};

export type ProducerRegistrationRequest = {
  readonly email: string;
  readonly password: string;
  readonly companyName: string;
  readonly businessNumber?: string;
  readonly representativeName?: string;
  readonly contactName: string;
};

export type ProducerRegistrationResponse = {
  readonly accountId: number;
  readonly companyId: number;
  readonly email: string;
  readonly verificationStatus: "PENDING" | "VERIFIED" | "REJECTED";
};

export type LoginRequest = {
  readonly email: string;
  readonly password: string;
};

export type ApplicantSignupForm = LoginRequest & {
  readonly name: string;
  readonly passwordConfirm: string;
  readonly termsAgreed: boolean;
  readonly profileClaimToken?: string;
};

export type ProducerSignupForm = LoginRequest & {
  readonly companyName: string;
  readonly businessNumber: string;
  readonly representativeName: string;
  readonly contactName: string;
};

export const getCurrentSession = () => apiRequest<SessionResponse>("/sessions/current");

export const login = (body: LoginRequest) => apiRequest<SessionResponse>("/sessions", {
  method: "POST",
  body: JSON.stringify(body),
});

export async function logout() {
  await apiRequest<void>("/sessions/current", { method: "DELETE" });
  clearApiSession();
}

export const selectActiveCompany = (companyId: number) => apiRequest<SessionResponse>(
  "/sessions/current/active-company",
  { method: "PUT", body: JSON.stringify({ companyId }) },
);

export async function signupApplicant(form: ApplicantSignupForm) {
  const registration = await apiRequest<ApplicantRegistrationResponse>("/applicants", {
    method: "POST",
    body: JSON.stringify({ email: form.email, password: form.password } satisfies ApplicantRegistrationRequest),
  });
  const session = await login({ email: form.email, password: form.password });
  return { registration, session, redirectTo: "/applicants" } as const;
}

export async function signupProducer(form: ProducerSignupForm) {
  const registration = await apiRequest<ProducerRegistrationResponse>("/producers", {
    method: "POST",
    body: JSON.stringify({
      email: form.email,
      password: form.password,
      companyName: form.companyName,
      businessNumber: form.businessNumber,
      representativeName: form.representativeName,
      contactName: form.contactName,
    } satisfies ProducerRegistrationRequest),
  });
  const session = await login({ email: form.email, password: form.password });
  return { registration, session, redirectTo: "/producers/performances" } as const;
}

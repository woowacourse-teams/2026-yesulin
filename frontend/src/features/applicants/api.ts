import type {
  ApplicantApplicationDetail,
  ApplicantApplicationListResponse,
  ApplicantProfileResponse,
  LookupApplicationRequest,
  LookupApplicationResponse,
  ProfilePrefillResponse,
  RecommendedPostingResponse,
  SubmitApplicationRequest,
  SubmitApplicationResponse,
  UpdateApplicationRequest,
  UpdateProfileRequest,
} from "./types";
import type { PublicPosting } from "@/features/applications/public-posting";
import type { ApplicationId } from "@/features/auditions/types";

const API_BASE_PATH = "/api";

export class ApplicantRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "ApplicantRequestError";
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_PATH}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const message = typeof body === "object" && body !== null && "message" in body && typeof body.message === "string"
      ? body.message
      : "요청을 처리하지 못했습니다.";
    const code = typeof body === "object" && body !== null && "code" in body && typeof body.code === "string"
      ? body.code
      : undefined;
    throw new ApplicantRequestError(message, response.status, code);
  }
  return response.json() as Promise<T>;
}

export const getApplicantProfile = () => request<ApplicantProfileResponse>("/me/profile");

export const updateApplicantProfile = (body: UpdateProfileRequest) => request<ApplicantProfileResponse>("/me/profile", {
  method: "PATCH",
  body: JSON.stringify(body),
});

export const getProfilePrefill = (postingId: string) => request<ProfilePrefillResponse>(`/me/profile/prefill?postingId=${encodeURIComponent(postingId)}`);

export const getApplicantApplications = () => request<ApplicantApplicationListResponse>("/me/applications");

export const getApplicantApplication = (applicationId: ApplicationId) => request<ApplicantApplicationDetail>(`/me/applications/${applicationId}`);

export const updateApplicantApplication = (applicationId: ApplicationId, body: UpdateApplicationRequest) => request<ApplicantApplicationDetail>(`/me/applications/${applicationId}`, {
  method: "PATCH",
  body: JSON.stringify(body),
});

export const getRecommendedPostings = (excludePostingId?: string, limit = 3) => {
  const query = new URLSearchParams({ limit: String(limit) });
  if (excludePostingId) query.set("excludePostingId", excludePostingId);
  return request<RecommendedPostingResponse>(`/public/recommended-postings?${query}`);
};

export const getPublicPosting = (postingId: string) =>
  request<PublicPosting>(`/public/postings/${postingId}`);

export const lookupApplication = (body: LookupApplicationRequest) => request<LookupApplicationResponse>("/public/applications/lookup", {
  method: "POST",
  body: JSON.stringify(body),
});

export const submitPublicApplication = (body: SubmitApplicationRequest) => request<SubmitApplicationResponse>("/public/applications", {
  method: "POST",
  body: JSON.stringify(body),
});

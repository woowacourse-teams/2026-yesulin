import type {
  ApplicantSubmissionDetail,
  ApplicantSubmissionListResponse,
  ApplicantProfileResponse,
  LookupSubmissionRequest,
  LookupSubmissionResponse,
  ProfilePrefillResponse,
  RecommendedPostingResponse,
  CreateSubmissionRequest,
  CreateSubmissionResponse,
  UpdateSubmissionRequest,
  UpdateProfileRequest,
} from "./types";
import type { PublicPosting } from "@/features/applications/public-posting";
import { getV1PublicPosting } from "@/features/applications/public-audition-v1";
import { isBackendAuditionId } from "@/features/auditions/audition-v1-api";
import type { SubmissionId } from "@/features/auditions/types";
import { withCsrfHeaders } from "@/features/csrf";

const API_BASE_PATH = "/api";
const WRITE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

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
  const method = (init?.method ?? "GET").toUpperCase();
  const baseHeaders = { "Content-Type": "application/json", ...init?.headers } as Record<string, string>;
  const headers = WRITE_METHODS.has(method) ? await withCsrfHeaders(baseHeaders) : baseHeaders;
  const response = await fetch(`${API_BASE_PATH}${path}`, {
    ...init,
    credentials: "include",
    headers,
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

export const getApplicantSubmissions = () => request<ApplicantSubmissionListResponse>("/me/submissions");

export const getApplicantSubmission = (submissionId: SubmissionId) => request<ApplicantSubmissionDetail>(`/me/submissions/${submissionId}`);

export const updateApplicantSubmission = (submissionId: SubmissionId, body: UpdateSubmissionRequest) => request<ApplicantSubmissionDetail>(`/me/submissions/${submissionId}`, {
  method: "PATCH",
  body: JSON.stringify(body),
});

export const getRecommendedPostings = (excludePostingId?: string, limit = 3) => {
  const query = new URLSearchParams({ limit: String(limit) });
  if (excludePostingId) query.set("excludePostingId", excludePostingId);
  return request<RecommendedPostingResponse>(`/public/recommended-postings?${query}`);
};

export const getPublicPosting = (postingId: string) =>
  isBackendAuditionId(postingId)
    ? getV1PublicPosting(postingId)
    : request<PublicPosting>(`/public/postings/${postingId}`);

export const lookupSubmission = (body: LookupSubmissionRequest) => request<LookupSubmissionResponse>("/public/submissions/lookup", {
  method: "POST",
  body: JSON.stringify(body),
});

export const createPublicSubmission = (body: CreateSubmissionRequest) => request<CreateSubmissionResponse>("/public/submissions", {
  method: "POST",
  body: JSON.stringify(body),
});

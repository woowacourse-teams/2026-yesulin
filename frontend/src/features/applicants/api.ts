import type {
  ApplicantSubmissionDetail,
  ApplicantSubmissionListResponse,
  LookupSubmissionRequest,
  LookupSubmissionResponse,
  ProfilePrefillResponse,
  RecommendedPostingResponse,
  CreateSubmissionRequest,
  CreateSubmissionResponse,
  UpdateSubmissionRequest,
} from "./types";
import type { PublicPosting } from "@/features/applications/public-posting";
import { getV1PublicPosting } from "@/features/applications/public-audition-v1";
import { isBackendAuditionId } from "@/features/auditions/audition-v1-api";
import type { SubmissionId } from "@/features/auditions/types";
import { applicantRequest as request } from "./request";

export { ApplicantRequestError } from "./request";
export { getApplicantProfile, updateApplicantProfile } from "./profile-api";

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

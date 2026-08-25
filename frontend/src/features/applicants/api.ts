import type {
  LookupSubmissionRequest,
  LookupSubmissionResponse,
  ProfilePrefillResponse,
  RecommendedPostingResponse,
  CreateSubmissionRequest,
  CreateSubmissionResponse,
} from "./types";
import type { PublicPosting } from "@/features/applications/public-posting";
import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import { getV1PublicPosting } from "@/features/applications/public-audition-v1";
import { isBackendAuditionId } from "@/features/auditions/audition-v1-api";
import { getApplicantProfile } from "./profile-api";
import { profilePrefillForFields } from "./profile-prefill";
import { applicantRequest as request } from "./request";

export { ApplicantRequestError } from "./request";
export { getApplicantProfile, updateApplicantProfile } from "./profile-api";
export { getApplicantSubmission, getApplicantSubmissions } from "./submission-api";

export async function getProfilePrefill(
  postingId: string,
  fields: readonly ApplicationFieldInput[],
): Promise<ProfilePrefillResponse> {
  if (!isBackendAuditionId(postingId)) {
    return request<ProfilePrefillResponse>(`/me/profile/prefill?postingId=${encodeURIComponent(postingId)}`);
  }
  return profilePrefillForFields(await getApplicantProfile(), fields);
}

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

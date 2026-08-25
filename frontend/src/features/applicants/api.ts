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
import { frontendEnvironment } from "@/config/environment";
import { applicantRequest as request } from "./request";
import { getV1ApplicantSubmission } from "./submission-detail-v1";
import { getV1ApplicantSubmissions } from "./submission-list-v1";

export { ApplicantRequestError } from "./request";
export { getApplicantProfile, updateApplicantProfile } from "./profile-api";

export const getProfilePrefill = (postingId: string) => request<ProfilePrefillResponse>(`/me/profile/prefill?postingId=${encodeURIComponent(postingId)}`);

/**
 * MSW 시나리오는 배역별 전형 상태까지 시드로 제공하므로 목 모드에서는 기존 목 계약을 유지하고,
 * 실제 API 모드에서만 Backend 목록을 화면 모델로 변환한다.
 */
export const getApplicantSubmissions = () => frontendEnvironment.apiMockingEnabled
  ? request<ApplicantSubmissionListResponse>("/me/submissions")
  : getV1ApplicantSubmissions();

export const getApplicantSubmission = (submissionId: SubmissionId) => frontendEnvironment.apiMockingEnabled
  ? request<ApplicantSubmissionDetail>(`/me/submissions/${submissionId}`)
  : getV1ApplicantSubmission(submissionId);

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

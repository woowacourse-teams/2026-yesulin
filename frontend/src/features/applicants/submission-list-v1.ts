import { submissionId } from "@/features/auditions/types";
import type { ApplicantSubmissionListResponse, ApplicantSubmissionSummary } from "./types";
import { applicantRequest } from "./request";
import { FALLBACK_POSTER_URL, toRoleProgress, type V1SelectedRole } from "./submission-summary";

/** 공고를 더 이상 찾을 수 없는 제출 이력도 목록에 남으므로 공고에서 온 값은 비어 있을 수 있다. */
type V1SubmissionSummary = {
  readonly submissionId: string;
  readonly auditionId: string | null;
  readonly auditionTitle: string;
  readonly performanceTitle: string | null;
  readonly companyName: string | null;
  readonly posterUrl: string | null;
  readonly submittedAt: string;
  readonly selectedRoles: readonly V1SelectedRole[];
};

type V1SubmissionListResponse = { readonly submissions: readonly V1SubmissionSummary[] };

export async function getV1ApplicantSubmissions(): Promise<ApplicantSubmissionListResponse> {
  const response = await applicantRequest<V1SubmissionListResponse>("/v1/applicants/me/submissions");
  return { submissions: response.submissions.map(toSummary) };
}

function toSummary(summary: V1SubmissionSummary): ApplicantSubmissionSummary {
  return {
    id: submissionId(summary.submissionId),
    postingId: summary.auditionId ?? "",
    performanceTitle: summary.performanceTitle ?? summary.auditionTitle,
    postingTitle: summary.auditionTitle,
    posterUrl: summary.posterUrl ?? FALLBACK_POSTER_URL,
    companyName: summary.companyName ?? "",
    roleName: summary.selectedRoles.map((role) => role.roleName).join(" · "),
    // 비로그인 조회 코드는 목표 계약에서 제외했고, 제출 스냅샷은 수정할 수 없다.
    lookupCode: "",
    submittedAt: summary.submittedAt,
    editable: false,
    recruitmentEnd: "",
    roleProgress: summary.selectedRoles.map(toRoleProgress),
  };
}

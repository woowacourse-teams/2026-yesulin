import { submissionId } from "@/features/auditions/types";
import type {
  ApplicantRoleProgress,
  ApplicantSubmissionListResponse,
  ApplicantSubmissionSummary,
} from "./types";
import { applicantRequest } from "./request";

/** 공고를 더 이상 찾을 수 없는 제출 이력도 목록에 남으므로 공고에서 온 값은 비어 있을 수 있다. */
type V1SubmissionSummary = {
  readonly submissionId: string;
  readonly auditionId: string | null;
  readonly auditionTitle: string;
  readonly performanceTitle: string | null;
  readonly companyName: string | null;
  readonly posterUrl: string | null;
  readonly submittedAt: string;
  readonly selectedRoles: readonly { readonly roleId: number; readonly roleName: string }[];
};

type V1SubmissionListResponse = { readonly submissions: readonly V1SubmissionSummary[] };

const FALLBACK_POSTER_URL = "/images/yesulin-logo-mark.png";

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

/** 심사 결과 공개 경계가 아직 없으므로 선택한 배역은 모두 접수 상태로만 보여 준다. */
function toRoleProgress(role: V1SubmissionSummary["selectedRoles"][number]): ApplicantRoleProgress {
  return {
    roleId: String(role.roleId),
    roleName: role.roleName,
    state: "RECEIVED",
    round: null,
    roundName: null,
  };
}

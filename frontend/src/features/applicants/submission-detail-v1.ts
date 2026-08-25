import { toApplicationFields } from "@/features/auditions/audition-v1-form";
import type { AuditionFormResource } from "@/features/auditions/backend-resources";
import { submissionId as toSubmissionId, type SubmissionId } from "@/features/auditions/types";
import { toProfileInformation } from "./profile-contract";
import type { BackendProfileResponse } from "./profile-contract";
import type { ApplicantAnswer, ApplicantSubmissionDetail } from "./types";
import { applicantRequest } from "./request";
import { FALLBACK_POSTER_URL, toRoleProgress } from "./submission-summary";

/** 제출 스냅샷 상세. 공고를 더 이상 찾을 수 없으면 공고에서 온 값은 비어 있다. */
type V1SubmissionDetail = {
  readonly submissionId: string;
  readonly auditionId: string | null;
  readonly auditionTitle: string;
  readonly performanceTitle: string | null;
  readonly companyName: string | null;
  readonly posterUrl: string | null;
  readonly submittedAt: string;
  readonly applicant: {
    readonly basicInformation: BackendProfileResponse["basicInformation"];
    readonly additionalInformation: BackendProfileResponse["additionalInformation"];
    readonly fieldSnapshot: {
      readonly basicFields: readonly string[];
      readonly additionalFields: readonly string[];
    };
    readonly ageAtRecruitmentDeadline: number | null;
  };
  readonly selectedRoles: readonly { readonly roleId: number; readonly roleName: string }[];
  readonly formAnswers: {
    readonly questionAnswers: readonly { readonly questionId: number; readonly question: string; readonly answer: string }[];
    readonly photoRequirementAnswers: readonly { readonly photoRequirementId: number; readonly requirementDescription: string; readonly fileId: number; readonly url: string }[];
    readonly videoRequirementAnswers: readonly { readonly videoRequirementId: number; readonly requirementDescription: string; readonly url: string }[];
  };
};

export async function getV1ApplicantSubmission(id: SubmissionId): Promise<ApplicantSubmissionDetail> {
  const detail = await applicantRequest<V1SubmissionDetail>(
    `/v1/applicants/me/submissions/${encodeURIComponent(id)}`,
  );
  return toDetail(detail);
}

function toDetail(detail: V1SubmissionDetail): ApplicantSubmissionDetail {
  const roleIds = detail.selectedRoles.map((role) => String(role.roleId));
  return {
    id: toSubmissionId(detail.submissionId),
    postingId: detail.auditionId ?? "",
    performanceTitle: detail.performanceTitle ?? detail.auditionTitle,
    postingTitle: detail.auditionTitle,
    posterUrl: detail.posterUrl ?? FALLBACK_POSTER_URL,
    companyName: detail.companyName ?? "",
    roleName: detail.selectedRoles.map((role) => role.roleName).join(" · "),
    lookupCode: "",
    submittedAt: detail.submittedAt,
    // 제출 스냅샷은 수정할 수 없으므로 수정 가능 시한도 두지 않는다.
    editable: false,
    recruitmentEnd: "",
    editableUntil: "",
    updatedAt: detail.submittedAt,
    roleProgress: detail.selectedRoles.map(toRoleProgress),
    roleId: roleIds[0] ?? "",
    roleIds,
    applicationFields: toApplicationFields(toFormResource(detail)),
    answers: toAnswers(detail),
  };
}

/**
 * 제출 당시 수집 항목과 요구 사항을 공고 폼 모양으로 되돌려 공개 공고와 같은 변환기를 재사용한다.
 * 같은 사진 요구에 여러 장을 냈으면 요구 하나에 장수를 합친다.
 */
function toFormResource(detail: V1SubmissionDetail): AuditionFormResource {
  const photoCounts = new Map<number, { description: string; count: number }>();
  detail.formAnswers.photoRequirementAnswers.forEach((answer) => {
    const current = photoCounts.get(answer.photoRequirementId);
    if (current) current.count += 1;
    else photoCounts.set(answer.photoRequirementId, { description: answer.requirementDescription, count: 1 });
  });

  return {
    auditionId: detail.auditionId ?? "",
    basicFields: detail.applicant.fieldSnapshot.basicFields,
    additionalFields: detail.applicant.fieldSnapshot.additionalFields,
    photoRequirements: [...photoCounts.entries()].map(([id, requirement], index) => ({
      id, order: index + 1, description: requirement.description, count: requirement.count,
    })),
    videoRequirements: detail.formAnswers.videoRequirementAnswers.map((answer, index) => ({
      id: answer.videoRequirementId, order: index + 1, description: answer.requirementDescription,
    })),
    additionalQuestions: detail.formAnswers.questionAnswers.map((answer, index) => ({
      id: answer.questionId, order: index + 1, question: answer.question, required: false, answerMaxLength: 2000,
    })),
  };
}

function toAnswers(detail: V1SubmissionDetail): readonly ApplicantAnswer[] {
  const information = toProfileInformation({
    basicInformation: detail.applicant.basicInformation,
    additionalInformation: detail.applicant.additionalInformation,
    completeness: { filled: 0, total: 8 },
  });
  const photoUrls = detail.formAnswers.photoRequirementAnswers.map((answer) => answer.url);
  const videoUrls = detail.formAnswers.videoRequirementAnswers.map((answer) => answer.url).filter(Boolean);

  return [
    ...information.answers,
    ...detail.formAnswers.questionAnswers.map((answer) => ({
      key: `question-${answer.questionId}`,
      label: answer.question,
      value: answer.answer,
      custom: true,
    })),
    ...(photoUrls.length ? [{ key: "PHOTOS", label: "프로필 사진", value: photoUrls, previewUrls: photoUrls }] : []),
    ...(videoUrls.length ? [{ key: "VIDEO", label: "제출 영상", value: videoUrls }] : []),
  ];
}

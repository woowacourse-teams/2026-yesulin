import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import { isBackendAuditionId } from "@/features/auditions/audition-v1-api";
import type { ApplicationPhoto, CareerDraft } from "./application-form-state";
import { hasSubmittedValue } from "./materials";
import { submissionValue } from "./public-application-draft";
import { createPublicSubmission } from "@/features/applicants/api";
import { saveSubmissionInformationToProfile } from "./submission-profile-save";
import { applicantInformation, createV1Submission, type V1SubmissionReceipt } from "./submission-v1";

type CreateApplicationSubmissionInput = {
  readonly postingId: string;
  readonly fields: readonly ApplicationFieldInput[];
  readonly values: Readonly<Record<string, string>>;
  readonly photos: readonly ApplicationPhoto[];
  readonly videoUrl: string;
  readonly careers: readonly CareerDraft[];
  readonly noCareer: boolean;
  readonly roleIds: readonly string[];
  readonly privacyConsent: boolean;
  readonly thirdPartyConsent: boolean;
  readonly saveToProfile: boolean;
};

export type ApplicationSubmissionResult = V1SubmissionReceipt & {
  /** 프로필 저장을 선택했을 때만 채워진다. 저장 실패는 제출 성공에 영향을 주지 않는다. */
  readonly profileSaved?: boolean;
};

export async function createApplicationSubmission(input: CreateApplicationSubmissionInput): Promise<ApplicationSubmissionResult> {
  if (isBackendAuditionId(input.postingId)) {
    const receipt = await createV1Submission({
      auditionId: input.postingId,
      fields: input.fields,
      values: input.values,
      photos: input.photos,
      videoUrl: input.videoUrl,
      careers: input.careers,
      noCareer: input.noCareer,
      roleIds: input.roleIds,
      privacyConsent: input.privacyConsent,
      thirdPartyConsent: input.thirdPartyConsent,
    });
    if (!input.saveToProfile) return receipt;
    const profileSaved = await saveSubmissionInformationToProfile(applicantInformation(input))
      .then(() => true, () => false);
    return { ...receipt, profileSaved };
  }

  const answers = input.fields.filter((field) => field.enabled).map((field) => ({
    field,
    value: submissionValue(field, input),
  })).filter(({ field, value }) => field.required || hasSubmittedValue(value));
  const response = await createPublicSubmission({
    postingId: input.postingId,
    roleIds: input.roleIds,
    answers: answers.map(({ field, value }) => ({
      key: field.id,
      ...(field.custom ? { label: field.label } : {}),
      value,
    })),
    privacyAgreed: input.privacyConsent && input.thirdPartyConsent,
    saveToProfile: input.saveToProfile,
  });
  return {
    submissionId: response.submissionId,
    submittedAt: response.submittedAt,
    // 시드 공고는 목 서버가 제출과 함께 프로필을 갱신하므로 선택했다면 저장 완료로 본다.
    ...(input.saveToProfile ? { profileSaved: true } : {}),
  };
}

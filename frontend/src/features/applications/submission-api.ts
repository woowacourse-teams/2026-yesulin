import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import type { ApplicationType } from "./application-type";
import { isBackendAuditionId } from "@/features/auditions/audition-v1-api";
import type { ApplicationPhoto, CareerDraft } from "./application-form-state";
import { hasSubmittedValue } from "./materials";
import { submissionValue } from "./public-application-draft";
import { createPublicSubmission } from "@/features/applicants/api";
import { saveSubmissionInformationToProfile } from "./submission-profile-save";
import { applicantInformation, createV1Submission, type V1SubmissionReceipt } from "./submission-v1";
import { submitOtrApplication } from "@/features/otr-auditions/submission-api";

type CreateApplicationSubmissionInput = {
  readonly applicationType: ApplicationType;
  readonly postingId: string;
  readonly postingSnapshotVersion: string;
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

export type ApplicationSubmissionResult = Omit<V1SubmissionReceipt, "submissionId"> & {
  readonly submissionId: string;
  /** 프로필 저장을 선택했을 때만 채워진다. 저장 실패는 제출 성공에 영향을 주지 않는다. */
  readonly profileSaved?: boolean;
};

export async function createApplicationSubmission(input: CreateApplicationSubmissionInput): Promise<ApplicationSubmissionResult> {
  if (input.applicationType === "OTR") {
    const information = applicantInformation(input);
    const videoField = input.fields.find((field) => field.enabled && field.id === "VIDEO");
    const videoUrls = (videoField?.config.videoRequirements ?? [])
      .map((requirement) => input.values[`VIDEO.${requirement.id}`]?.trim() ?? "")
      .filter(Boolean);
    const receipt = await submitOtrApplication(input.postingId, {
      type: "OTR",
      postingSnapshotVersion: input.postingSnapshotVersion,
      selectedRole: input.values.SELECTED_ROLE?.trim() ?? "",
      ...information,
      videoUrls,
      privacyCollectionAndUseAgreed: input.privacyConsent,
      thirdPartyProvisionAgreed: input.thirdPartyConsent,
    }, input.photos);
    const result = { ...receipt, submissionId: String(receipt.submissionId) };
    if (!input.saveToProfile) return result;
    const profileSaved = await saveSubmissionInformationToProfile(information).then(() => true, () => false);
    return { ...result, profileSaved };
  }
  if (isBackendAuditionId(input.postingId)) {
    const receipt = await createV1Submission({
      auditionId: input.postingId,
      postingSnapshotVersion: input.postingSnapshotVersion,
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
    postingSnapshotVersion: input.postingSnapshotVersion,
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

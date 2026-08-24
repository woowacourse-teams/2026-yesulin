import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import { isBackendAuditionId } from "@/features/auditions/audition-v1-api";
import type { ApplicationPhoto, CareerDraft } from "./application-form-state";
import { hasSubmittedValue } from "./materials";
import { submissionValue } from "./public-application-draft";
import { createPublicSubmission } from "@/features/applicants/api";
import { createV1Submission, type V1SubmissionReceipt } from "./submission-v1";

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

export async function createApplicationSubmission(input: CreateApplicationSubmissionInput): Promise<V1SubmissionReceipt> {
  if (isBackendAuditionId(input.postingId)) {
    return createV1Submission({
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
  return { submissionId: response.submissionId, submittedAt: response.submittedAt };
}

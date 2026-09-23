import { applicantRequest } from "@/features/applicants/request";
import { request } from "@/features/auditions/api-client";
import type { ApplicationPhoto } from "@/features/applications/application-form-state";
import type { ApplicantInformation } from "@/features/applications/submission-v1";
import { actorPhotoFileId } from "@/features/applications/submission-v1";
import { orderedApplicationPhotos } from "@/features/applications/application-form-state";
import { uploadSequentially } from "@/features/files/safe-upload";
import type { PublicOtrAudition } from "./types";

export type OtrApplication = {
  readonly type: "OTR";
  readonly postingSnapshotVersion: string;
  readonly selectedRole: string;
  readonly basicInformation: ApplicantInformation["basicInformation"];
  readonly additionalInformation: ApplicantInformation["additionalInformation"];
  readonly videoUrls: readonly string[];
  readonly privacyCollectionAndUseAgreed: boolean;
  readonly thirdPartyProvisionAgreed: boolean;
};

export type OtrSubmissionReceipt = { readonly submissionId: number; readonly submittedAt: string };

export function getPublicOtrAudition(id: string) {
  return request<PublicOtrAudition>(`/v1/public/otr-auditions/${encodeURIComponent(id)}`);
}

export async function submitOtrApplication(id: string, application: OtrApplication, photos: readonly ApplicationPhoto[]) {
  const readyPhotos = orderedApplicationPhotos(photos).filter((photo) => photo.status === "READY");
  if (readyPhotos.length > 3) {
    throw new Error("사진은 최대 3장까지 제출할 수 있어요.");
  }
  const photoFileIds = await uploadSequentially(readyPhotos, actorPhotoFileId);
  return applicantRequest<OtrSubmissionReceipt>(`/v1/otr-auditions/${encodeURIComponent(id)}/submissions`, {
    method: "POST", body: JSON.stringify({ ...application, photoFileIds }),
  });
}

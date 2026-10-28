import { prepareApplicantPhotoPublicCopies } from "@/features/applicants/profile-photo-api";
import { applicantRequest } from "@/features/applicants/request";
import type { ApplicantProfileResponse } from "@/features/applicants/types";
import type { ActorHandleAvailability, ActorPageField, ActorPageSettings, ActorPageVisibility } from "./settings";
import type { ActorPageContent } from "./types";

const BASE_PATH = "/v1/applicants/me/actor-page";

export const getActorPageSettings = () => applicantRequest<ActorPageSettings>(BASE_PATH);

export const getActorPagePreview = () => applicantRequest<ActorPageContent>(`${BASE_PATH}/preview`);

export const getActorHandleAvailability = (handle: string) =>
  applicantRequest<ActorHandleAvailability>(`${BASE_PATH}/handle-availability?handle=${encodeURIComponent(handle)}`);

export const changeActorHandle = (handle: string) => applicantRequest<ActorPageSettings>(`${BASE_PATH}/handle`, {
  method: "PUT",
  body: JSON.stringify({ handle }),
});

export const changeActorPageFieldVisibilities = (changes: Partial<Record<ActorPageField, ActorPageVisibility>>) =>
  applicantRequest<ActorPageSettings>(`${BASE_PATH}/visibility`, { method: "PATCH", body: JSON.stringify(changes) });

export const unpublishActorPage = () => applicantRequest<ActorPageSettings>(`${BASE_PATH}/publication`, { method: "DELETE" });

/** 공개 팝업을 보여 줬다고 기록한다. 공개하든 닫든 다시 띄우지 않는다. */
export const recordActorPagePublishPrompt = () => applicantRequest<void>(`${BASE_PATH}/publish-prompt`, { method: "POST" });

export type PublishedActorPage = {
  readonly settings: ActorPageSettings;
  readonly profile: ApplicantProfileResponse;
  /** 공개 사본을 만들지 못해 페이지에 빠진 사진. */
  readonly failedPhotoIds: readonly string[];
};

/**
 * 공개 사진의 공개 사본을 먼저 만들고 공개한다. 일부 사진이 실패하면 그 사진만 빼고 공개하지만, 사본이 있는 공개 사진이
 * 하나도 없으면 공개하지 않는다. 동의 문구 버전은 서버가 알려 준 현재 버전을 보낸다.
 */
export async function publishActorPage(profile: ApplicantProfileResponse, consentVersion: string): Promise<PublishedActorPage> {
  const prepared = await prepareApplicantPhotoPublicCopies(profile);
  if (!prepared.profile.photoLibrary.some((photo) => photo.visibility === "PUBLIC" && photo.publicCopyUrl)) {
    throw new Error("공개 사진을 준비하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }
  const settings = await applicantRequest<ActorPageSettings>(`${BASE_PATH}/publication`, {
    method: "PUT",
    body: JSON.stringify({ agreed: true, consentVersion }),
  });
  return { settings, profile: prepared.profile, failedPhotoIds: prepared.failedPhotoIds };
}

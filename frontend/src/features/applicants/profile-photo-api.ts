import type { ApplicantProfilePhoto, ApplicantProfileResponse } from "./types";
import { applicantProfileApiEnabled } from "./profile-mode";
import { applicantRequest } from "./request";
import { safeUpload, type UploadResource } from "../files/safe-upload";
import { reportUploadDiagnostic } from "../files/upload-diagnostics";
import { MAX_ACTOR_PHOTO_COUNT } from "../files/photo-policy";
import { ensurePublicCopies } from "./photo-public-copy";

type BackendPhoto = {
  readonly id: number;
  readonly fileId: number;
  readonly imageUrl: string;
  readonly displayOrder: number;
  readonly representative: boolean;
  readonly createdAt: string;
  readonly visibility: "PUBLIC" | "PRIVATE";
  readonly publicCopyUrl: string | null;
};

type BackendPhotoLibrary = { readonly photos: readonly BackendPhoto[] };
export async function getApplicantProfilePhotos(): Promise<readonly ApplicantProfilePhoto[]> {
  const result = await applicantRequest<BackendPhotoLibrary>("/v1/applicants/me/photo-library/photos");
  return toPhotos(result.photos);
}

export async function addApplicantProfilePhotos(
  current: ApplicantProfileResponse,
  files: readonly File[],
): Promise<ApplicantProfileResponse> {
  if (!applicantProfileApiEnabled) {
    const additions = files.map((file, index) => ({
      id: `profile-photo-${Date.now()}-${index}`,
      name: file.name,
      url: URL.createObjectURL(file),
      representative: current.photoLibrary.length === 0 && index === 0,
    }));
    return updateLegacyPhotos([...current.photoLibrary, ...additions]);
  }

  const addedPhotoIds: number[] = [];
  try {
    for (const [index, file] of files.entries()) {
      try {
        const photo = await uploadAndAddPhoto(file);
        addedPhotoIds.push(photo.id);
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "사진 업로드에 실패했습니다.";
        throw new Error(`${index + 1}번째 사진: ${message}`, { cause });
      }
    }
  } catch (cause) {
    await Promise.allSettled(addedPhotoIds.map((photoId) => applicantRequest<void>(
      `/v1/applicants/me/photo-library/photos/${photoId}`,
      { method: "DELETE" },
    )));
    throw cause;
  }
  return refreshPhotos(current);
}

export async function deleteApplicantProfilePhoto(
  current: ApplicantProfileResponse,
  photo: ApplicantProfilePhoto,
): Promise<ApplicantProfileResponse> {
  if (!applicantProfileApiEnabled) {
    const remaining = current.photoLibrary.filter((candidate) => candidate.id !== photo.id);
    const next = photo.representative && remaining[0]
      ? remaining.map((candidate, index) => ({ ...candidate, representative: index === 0 }))
      : remaining;
    return updateLegacyPhotos(next);
  }
  await applicantRequest<void>(`/v1/applicants/me/photo-library/photos/${photo.id}`, { method: "DELETE" });
  return refreshPhotos(current);
}

export async function makeApplicantProfilePhotoRepresentative(
  current: ApplicantProfileResponse,
  id: string,
): Promise<ApplicantProfileResponse> {
  if (!applicantProfileApiEnabled) {
    return updateLegacyPhotos(current.photoLibrary.map((photo) => ({
      ...photo,
      representative: photo.id === id,
    })));
  }
  const result = await applicantRequest<BackendPhotoLibrary>(
    `/v1/applicants/me/photo-library/photos/${id}/representative`,
    { method: "PATCH" },
  );
  return { ...current, photoLibrary: toPhotos(result.photos, current.photoLibrary) };
}

export async function moveApplicantProfilePhoto(
  current: ApplicantProfileResponse,
  index: number,
  target: number,
): Promise<ApplicantProfileResponse> {
  if (applicantProfileApiEnabled) {
    const photo = current.photoLibrary[index];
    if (!photo) return current;
    const result = await applicantRequest<BackendPhotoLibrary>(
      `/v1/applicants/me/photo-library/photos/${photo.id}`,
      { method: "PATCH", body: JSON.stringify({ displayOrder: target }) },
    );
    return { ...current, photoLibrary: toPhotos(result.photos, current.photoLibrary) };
  }
  const next = [...current.photoLibrary];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return updateLegacyPhotos(next);
}

/** 배우 페이지 공개 여부를 바꾼다. 비공개로 바꾸면 서버가 공개 사본을 지운다. */
export async function changeApplicantProfilePhotoVisibility(
  current: ApplicantProfileResponse,
  id: string,
  visibility: "PUBLIC" | "PRIVATE",
): Promise<ApplicantProfileResponse> {
  if (!applicantProfileApiEnabled) {
    return updateLegacyPhotos(current.photoLibrary.map((photo) => photo.id === id
      ? { ...photo, visibility, publicCopyUrl: visibility === "PUBLIC" ? photo.publicCopyUrl : null }
      : photo));
  }
  const result = await applicantRequest<BackendPhotoLibrary>(
    `/v1/applicants/me/photo-library/photos/${id}/visibility`,
    { method: "PATCH", body: JSON.stringify({ visibility }) },
  );
  return { ...current, photoLibrary: toPhotos(result.photos, current.photoLibrary) };
}

/**
 * 공개로 설정했지만 공개 사본이 없는 사진의 사본을 만든다. 실패한 사진은 빼고 진행하며 다시 시도하도록 알려 준다.
 * 목 환경은 사본 대신 원본 주소를 붙여 저장한다.
 */
export async function prepareApplicantPhotoPublicCopies(
  current: ApplicantProfileResponse,
): Promise<{ readonly profile: ApplicantProfileResponse; readonly failedPhotoIds: readonly string[] }> {
  const result = await ensurePublicCopies(current.photoLibrary);
  if (!applicantProfileApiEnabled && result.photos.some((photo, index) => photo !== current.photoLibrary[index])) {
    return { profile: await updateLegacyPhotos(result.photos), failedPhotoIds: result.failedPhotoIds };
  }
  return { profile: { ...current, photoLibrary: result.photos }, failedPhotoIds: result.failedPhotoIds };
}

/** 서버가 사진을 바꾼 뒤(비공개 전환으로 사본 삭제 등) 보관함을 다시 읽는다. */
export async function reloadApplicantProfilePhotos(current: ApplicantProfileResponse): Promise<ApplicantProfileResponse> {
  if (!applicantProfileApiEnabled) {
    const legacy = await applicantRequest<ApplicantProfileResponse>("/me/profile");
    return { ...current, photoLibrary: legacy.photoLibrary };
  }
  return refreshPhotos(current);
}

function toPhotos(
  photos: readonly BackendPhoto[],
  previous: readonly ApplicantProfilePhoto[] = [],
): readonly ApplicantProfilePhoto[] {
  const names = new Map(previous.map((photo) => [photo.id, photo.name]));
  return [...photos]
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .slice(0, MAX_ACTOR_PHOTO_COUNT)
    .map((photo, index) => ({
      id: String(photo.id),
      name: names.get(String(photo.id)) ?? `프로필 사진 ${index + 1}`,
      url: photo.imageUrl,
      representative: photo.representative,
      fileId: photo.fileId,
      visibility: photo.visibility,
      publicCopyUrl: photo.publicCopyUrl,
    }));
}

async function uploadAndAddPhoto(file: File) {
  const upload = await safeUpload({
    flow: "PROFILE_PHOTO",
    source: file,
    originalFilename: file.name,
    requestUpload: (metadata, { incidentId }) => applicantRequest<UploadResource>("/v1/actor-photos/upload-requests", {
      method: "POST",
      headers: { "X-Request-Id": incidentId },
      body: JSON.stringify(metadata),
    }),
    completeUpload: (fileId, { incidentId }) => applicantRequest<void>(`/v1/actor-photos/${fileId}/completion`, {
      method: "PATCH",
      headers: { "X-Request-Id": incidentId },
    }),
    reportDiagnostic: reportUploadDiagnostic,
  });
  return applicantRequest<BackendPhoto>("/v1/applicants/me/photo-library/photos", {
    method: "POST",
    headers: { "X-Request-Id": upload.incidentId },
    body: JSON.stringify({ fileId: upload.fileId }),
  });
}

async function refreshPhotos(current: ApplicantProfileResponse) {
  const result = await applicantRequest<BackendPhotoLibrary>("/v1/applicants/me/photo-library/photos");
  return { ...current, photoLibrary: toPhotos(result.photos, current.photoLibrary) };
}

function updateLegacyPhotos(photos: readonly ApplicantProfilePhoto[]) {
  return applicantRequest<ApplicantProfileResponse>("/me/profile", {
    method: "PATCH",
    body: JSON.stringify({ photoLibrary: photos }),
  });
}

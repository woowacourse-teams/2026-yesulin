import type { ApplicantProfilePhoto, ApplicantProfileResponse } from "./types";
import { applicantProfileApiEnabled } from "./profile-mode";
import { applicantRequest } from "./request";

type BackendPhoto = {
  readonly id: number;
  readonly fileId: number;
  readonly imageUrl: string;
  readonly displayOrder: number;
  readonly representative: boolean;
  readonly createdAt: string;
};

type BackendPhotoLibrary = { readonly photos: readonly BackendPhoto[] };
type UploadRequest = {
  readonly fileId: number;
  readonly uploadUrl: string;
  readonly method: string;
  readonly headers: Readonly<Record<string, string>>;
};

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
    for (const file of files) {
      const photo = await uploadAndAddPhoto(file);
      addedPhotoIds.push(photo.id);
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

function toPhotos(
  photos: readonly BackendPhoto[],
  previous: readonly ApplicantProfilePhoto[] = [],
): readonly ApplicantProfilePhoto[] {
  const names = new Map(previous.map((photo) => [photo.id, photo.name]));
  return [...photos]
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map((photo, index) => ({
      id: String(photo.id),
      name: names.get(String(photo.id)) ?? `프로필 사진 ${index + 1}`,
      url: photo.imageUrl,
      representative: photo.representative,
      fileId: photo.fileId,
    }));
}

async function uploadAndAddPhoto(file: File) {
  const upload = await applicantRequest<UploadRequest>("/v1/actor-photos/upload-requests", {
    method: "POST",
    body: JSON.stringify({ originalFilename: file.name, contentType: file.type, size: file.size }),
  });
  const response = await fetch(upload.uploadUrl, {
    method: upload.method,
    headers: upload.headers,
    body: file,
  });
  if (!response.ok) throw new Error("사진 파일을 업로드하지 못했습니다.");
  await applicantRequest<void>(`/v1/actor-photos/${upload.fileId}/completion`, { method: "PATCH" });
  return applicantRequest<BackendPhoto>("/v1/applicants/me/photo-library/photos", {
    method: "POST",
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

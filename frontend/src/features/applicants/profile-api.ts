import type { ApplicantProfileResponse, ApplicantProfileVideo } from "./types";
import type { ApplicantProfileValues, BackendProfileResponse } from "./profile-contract";
import { toBackendProfileUpdate, toLegacyProfileUpdate, toProfileInformation } from "./profile-contract";
import { getApplicantProfilePhotos } from "./profile-photo-api";
import { applicantProfileApiEnabled } from "./profile-mode";
import { applicantRequest } from "./request";

type BackendVideo = {
  readonly id: number;
  readonly url: string;
  readonly youtubeId: string;
  readonly displayOrder: number;
  readonly createdAt: string;
  readonly visibility: "PUBLIC" | "PRODUCER";
};

type BackendVideoLibrary = { readonly videos: readonly BackendVideo[] };

export async function getApplicantProfile(): Promise<ApplicantProfileResponse> {
  if (!applicantProfileApiEnabled) {
    return applicantRequest<ApplicantProfileResponse>("/me/profile");
  }

  const [information, photos, videoLibrary] = await Promise.all([
    applicantRequest<BackendProfileResponse>("/v1/applicants/me/profile"),
    getApplicantProfilePhotos(),
    applicantRequest<BackendVideoLibrary>("/v1/applicants/me/video-library/videos"),
  ]);
  return assembleProfile(information, photos, toVideos(videoLibrary.videos));
}

export async function updateApplicantProfile(
  values: ApplicantProfileValues,
  current: ApplicantProfileResponse,
): Promise<ApplicantProfileResponse> {
  if (!applicantProfileApiEnabled) {
    return applicantRequest<ApplicantProfileResponse>("/me/profile", {
      method: "PATCH",
      body: JSON.stringify(toLegacyProfileUpdate(values)),
    });
  }

  const information = await applicantRequest<BackendProfileResponse>("/v1/applicants/me/profile", {
    method: "PATCH",
    body: JSON.stringify(toBackendProfileUpdate(values)),
  });
  return assembleProfile(information, current.photoLibrary, current.videoLibrary);
}

export async function addApplicantProfileVideo(
  current: ApplicantProfileResponse,
  url: string,
  youtubeId: string,
): Promise<ApplicantProfileResponse> {
  if (!applicantProfileApiEnabled) {
    return updateLegacyVideos(current, [...current.videoLibrary, {
      id: `profile-video-${Date.now()}`,
      url,
      youtubeId,
    }]);
  }
  await applicantRequest<BackendVideo>("/v1/applicants/me/video-library/videos", {
    method: "POST",
    body: JSON.stringify({ url }),
  });
  return refreshVideos(current);
}

export async function deleteApplicantProfileVideo(
  current: ApplicantProfileResponse,
  id: string,
): Promise<ApplicantProfileResponse> {
  if (!applicantProfileApiEnabled) {
    return updateLegacyVideos(current, current.videoLibrary.filter((video) => video.id !== id));
  }
  await applicantRequest<void>(`/v1/applicants/me/video-library/videos/${id}`, { method: "DELETE" });
  return refreshVideos(current);
}

export async function moveApplicantProfileVideo(
  current: ApplicantProfileResponse,
  id: string,
  targetOrder: number,
): Promise<ApplicantProfileResponse> {
  if (!applicantProfileApiEnabled) {
    const index = current.videoLibrary.findIndex((video) => video.id === id);
    if (index < 0) return current;
    const next = [...current.videoLibrary];
    [next[index], next[targetOrder]] = [next[targetOrder]!, next[index]!];
    return updateLegacyVideos(current, next);
  }
  const result = await applicantRequest<BackendVideoLibrary>(`/v1/applicants/me/video-library/videos/${id}`, {
    method: "PATCH",
    body: JSON.stringify({ displayOrder: targetOrder }),
  });
  return { ...current, videoLibrary: toVideos(result.videos) };
}

/** 영상의 배우 페이지 공개 범위를 바꾼다. '공연사만'은 공개 페이지에 나오지 않는다. */
export async function changeApplicantProfileVideoVisibility(
  current: ApplicantProfileResponse,
  id: string,
  visibility: "PUBLIC" | "PRODUCER",
): Promise<ApplicantProfileResponse> {
  if (!applicantProfileApiEnabled) {
    return updateLegacyVideos(current, current.videoLibrary.map((video) => video.id === id ? { ...video, visibility } : video));
  }
  const result = await applicantRequest<BackendVideoLibrary>(`/v1/applicants/me/video-library/videos/${id}/visibility`, {
    method: "PATCH",
    body: JSON.stringify({ visibility }),
  });
  return { ...current, videoLibrary: toVideos(result.videos) };
}

function assembleProfile(
  information: BackendProfileResponse,
  photoLibrary: ApplicantProfileResponse["photoLibrary"],
  videoLibrary: ApplicantProfileResponse["videoLibrary"],
): ApplicantProfileResponse {
  return { ...toProfileInformation(information), photoLibrary, videoLibrary };
}

function toVideos(videos: readonly BackendVideo[]): readonly ApplicantProfileVideo[] {
  return [...videos]
    .sort((left, right) => left.displayOrder - right.displayOrder)
    .map((video) => ({ id: String(video.id), url: video.url, youtubeId: video.youtubeId, visibility: video.visibility }));
}

async function refreshVideos(current: ApplicantProfileResponse) {
  const result = await applicantRequest<BackendVideoLibrary>("/v1/applicants/me/video-library/videos");
  return { ...current, videoLibrary: toVideos(result.videos) };
}

function updateLegacyVideos(current: ApplicantProfileResponse, videos: readonly ApplicantProfileVideo[]) {
  return applicantRequest<ApplicantProfileResponse>("/me/profile", {
    method: "PATCH",
    body: JSON.stringify({ videoLibrary: videos }),
  });
}

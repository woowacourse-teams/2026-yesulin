import { shrinkPhoto } from "@/features/companies/photo-image";
import { safeUpload } from "../files/safe-upload";
import { applicantProfileApiEnabled } from "./profile-mode";
import { applicantRequest } from "./request";
import type { ApplicantProfilePhoto } from "./types";

type PublicCopyUpload = {
  readonly url: string;
  readonly method: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly uploadKey: string;
};

type CopiedPhoto = { readonly publicCopyUrl: string | null };

export type PublicCopyResult = {
  readonly photos: readonly ApplicantProfilePhoto[];
  /** 사본을 만들지 못한 사진. 이 사진만 빼고 진행하고 다시 시도하도록 안내한다. */
  readonly failedPhotoIds: readonly string[];
};

/**
 * 배우 페이지에 보일 공개 사본을 만들고 주소를 준다. 보관함 원본을 받아 긴 변 1600px JPEG로 줄인 뒤 저장소에 바로 올리고
 * 사진에 붙인다. 다시 그리므로 촬영 위치 같은 EXIF는 남지 않는다. 공개로 설정한 사진에만 만들 수 있다.
 */
export async function createPhotoPublicCopy(photo: Pick<ApplicantProfilePhoto, "id" | "url">): Promise<string> {
  if (!applicantProfileApiEnabled) return photo.url;
  const resized = await shrinkPhoto(await readOriginal(photo.url));
  const path = `/v1/applicants/me/photo-library/photos/${photo.id}/public-copy`;
  let uploadKey = "";
  let publicCopyUrl = "";
  await safeUpload({
    flow: "PROFILE_PHOTO",
    source: resized,
    originalFilename: "actor-page-photo.jpg",
    requestUpload: async (metadata) => {
      const upload = await applicantRequest<PublicCopyUpload>(`${path}/upload-requests`, {
        method: "POST",
        body: JSON.stringify({ contentType: metadata.contentType, size: metadata.size }),
      });
      uploadKey = upload.uploadKey;
      return { fileId: 0, uploadUrl: upload.url, method: upload.method, headers: upload.headers };
    },
    completeUpload: async () => {
      const copied = await applicantRequest<CopiedPhoto>(`${path}/completion`, {
        method: "PATCH",
        body: JSON.stringify({ uploadKey }),
      });
      publicCopyUrl = copied.publicCopyUrl ?? "";
    },
  });
  return publicCopyUrl;
}

/**
 * 공개로 설정했지만 사본이 없는 사진의 사본을 만든다. 한 장이 실패해도 나머지는 계속 만든다. 휴대폰에서 큰 사진을 동시에
 * 여러 장 줄이면 메모리가 부족할 수 있어 한 장씩 처리한다.
 */
export async function ensurePublicCopies(photos: readonly ApplicantProfilePhoto[]): Promise<PublicCopyResult> {
  const next: ApplicantProfilePhoto[] = [];
  const failedPhotoIds: string[] = [];
  for (const photo of photos) {
    if (photo.visibility !== "PUBLIC" || photo.publicCopyUrl) {
      next.push(photo);
      continue;
    }
    try {
      next.push({ ...photo, publicCopyUrl: await createPhotoPublicCopy(photo) });
    } catch {
      failedPhotoIds.push(photo.id);
      next.push(photo);
    }
  }
  return { photos: next, failedPhotoIds };
}

/** 보관함 원본은 본인만 받을 수 있는 주소라 로그인 쿠키를 함께 보낸다. */
async function readOriginal(url: string): Promise<File> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) throw new Error("보관함 사진을 불러오지 못했어요. 다시 시도해 주세요.");
  const original = await response.blob();
  return new File([original], "profile-photo", { type: original.type });
}

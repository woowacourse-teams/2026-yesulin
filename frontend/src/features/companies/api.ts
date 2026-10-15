import type { CompanyPhotoUpload } from "@/features/admin/types";
import { request } from "@/features/auditions/api-client";
import { safeUpload } from "@/features/files/safe-upload";
import type { AuditionPostSummary } from "@/features/audition-posts/types";
import type { CompanyField, CompanyWrite } from "./profile-draft";
import { companyApiPaths, type Company } from "./types";

export function getCompany(companyId: number | string): Promise<Company> {
  return request<Company>(companyApiPaths.detail(companyId));
}

export async function getCompanyPosts(companyId: number | string): Promise<readonly AuditionPostSummary[]> {
  const response = await request<{ readonly posts: readonly AuditionPostSummary[] }>(companyApiPaths.posts(companyId));
  return response.posts;
}
/** 공연사 정보 수정 요청. 로그인 없이 누구나 보내고, 운영자가 확인한 뒤 적용한다. */
export type CompanyEditRequestWrite = {
  readonly company: CompanyWrite;
  /** 요청자가 바꾼 항목. 하나 이상이어야 한다. */
  readonly changedFields: readonly CompanyField[];
  readonly reason: string;
  /** 확인 연락을 받을 이메일이나 전화번호. 선택이다. */
  readonly contact: string;
  /** 사진을 바꿔 달라면서 함께 올린 사진의 업로드 키. 사진을 바꿨는데 없으면 지워 달라는 뜻이다. */
  readonly photoUploadKey: string | null;
};

export function requestCompanyEdit(companyId: number | string, write: CompanyEditRequestWrite): Promise<{ readonly id: number }> {
  return request<{ readonly id: number }>(companyApiPaths.editRequests(companyId), {
    method: "POST",
    body: JSON.stringify(write),
  });
}

/**
 * 수정 요청에 넣을 줄인 사진을 저장소로 바로 올리고 업로드 키를 준다. 운영자가 적용하기 전까지 비공개로 둔다.
 * 로그인 없이 쓰는 화면이라 업로드 진단은 보내지 않는다.
 */
export async function uploadCompanyRequestPhoto(companyId: number | string, photo: Blob): Promise<string> {
  let uploadKey = "";
  await safeUpload({
    flow: "COMPANY_PHOTO",
    source: photo,
    originalFilename: "company-photo.jpg",
    requestUpload: async (metadata) => {
      const upload = await request<CompanyPhotoUpload>(companyApiPaths.editRequestPhotoUploads(companyId), {
        method: "POST",
        body: JSON.stringify({ contentType: metadata.contentType, size: metadata.size }),
      });
      uploadKey = upload.uploadKey ?? "";
      return { fileId: 0, uploadUrl: upload.url, method: upload.method, headers: upload.headers };
    },
    completeUpload: async () => {},
  });
  return uploadKey;
}

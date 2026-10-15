import { request } from "@/features/auditions/api-client";
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
};

export function requestCompanyEdit(companyId: number | string, write: CompanyEditRequestWrite): Promise<{ readonly id: number }> {
  return request<{ readonly id: number }>(companyApiPaths.editRequests(companyId), {
    method: "POST",
    body: JSON.stringify(write),
  });
}

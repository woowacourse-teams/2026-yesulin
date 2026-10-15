import { request } from "@/features/auditions/api-client";
import type { AuditionPostSummary } from "@/features/audition-posts/types";
import { companyApiPaths, type Company } from "./types";

export function getCompany(companyId: number | string): Promise<Company> {
  return request<Company>(companyApiPaths.detail(companyId));
}

export async function getCompanyPosts(companyId: number | string): Promise<readonly AuditionPostSummary[]> {
  const response = await request<{ readonly posts: readonly AuditionPostSummary[] }>(companyApiPaths.posts(companyId));
  return response.posts;
}
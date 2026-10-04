import { request } from "@/features/auditions/api-client";
import { auditionPostApiPaths, type AuditionPost, type AuditionPostPage, type AuditionPostQuery } from "./types";

export function getAuditionPosts(query: AuditionPostQuery): Promise<AuditionPostPage> {
  return request<AuditionPostPage>(auditionPostApiPaths.list(query));
}

export function getAuditionPost(postId: number | string): Promise<AuditionPost> {
  return request<AuditionPost>(auditionPostApiPaths.detail(postId));
}

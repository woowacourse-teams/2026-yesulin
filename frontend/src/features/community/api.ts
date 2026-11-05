import { request } from "@/features/auditions/api-client";
import { communityListMemory } from "./list-memory";
import { prepareIdentity } from "./identity";
import { communityPath, type CommunityEntry, type CommunityLikeState, type CommunityPage, type ReportReason, type CommunityAuthorMode, type CommunityParticipation } from "./types";

async function read<T>(path: string): Promise<T> {
  await prepareIdentity(false).catch(() => {});
  return request<T>(path, { cache: "no-store" });
}

async function write<T>(path: string, method: string, payload?: object): Promise<T> {
  await prepareIdentity(false).catch(() => {});
  const result = await request<T>(path, { method, body: JSON.stringify(payload) });
  communityListMemory.scroll = 0;
  return result;
}

export function getPosts(before?: number): Promise<CommunityPage> {
  if (before) return read(`${communityPath}?before=${before}`);
  return read(communityPath);
}

export function getPost(id: number): Promise<CommunityEntry> {
  return read(`${communityPath}/${id}`);
}

export function createPost(input: { title: string; body: string; authorMode: CommunityAuthorMode; expectedMemberId: number }, requestId: string): Promise<CommunityEntry> {
  return write(communityPath, "POST", { ...input, requestId });
}

export function editPost(id: number, input: { title: string; body: string }): Promise<CommunityEntry> {
  return write(`${communityPath}/${id}`, "PUT", input);
}

export function deletePost(id: number): Promise<void> {
  return write(`${communityPath}/${id}`, "DELETE");
}

export function getComments(id: number, after = 0): Promise<CommunityPage> {
  return read(`${communityPath}/${id}/comments?after=${after}`);
}

export function createComment(id: number, body: string, requestId: string, authorMode: CommunityAuthorMode, expectedMemberId: number): Promise<CommunityEntry> {
  return write(`${communityPath}/${id}/comments`, "POST", { body, requestId, authorMode, expectedMemberId });
}

export function editComment(postId: number, id: number, body: string): Promise<CommunityEntry> {
  return write(`${communityPath}/${postId}/comments/${id}`, "PUT", { body });
}

export function deleteComment(postId: number, id: number): Promise<void> {
  return write(`${communityPath}/${postId}/comments/${id}`, "DELETE");
}

export async function reportEntry(id: number, reason: ReportReason, detail: string, requestId: string): Promise<void> {
  await prepareIdentity(true);
  return write(`/v1/public/community/entries/${id}/reports`, "POST", { reason, detail, requestId });
}

export async function setPostLike(id: number, liked: boolean): Promise<CommunityLikeState> {
  await prepareIdentity(true);
  let method = "DELETE";
  if (liked) method = "PUT";
  return write(`${communityPath}/${id}/likes`, method);
}

export function getParticipation(postId?: number): Promise<CommunityParticipation> {
  let path = `${communityPath}/participation`;
  if (postId) path += `?postId=${postId}`;
  return request(path, { cache: "no-store" });
}

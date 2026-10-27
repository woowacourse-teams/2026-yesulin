import { request } from "@/features/auditions/api-client";
import { communityListMemory } from "./list-memory";
import { readIdentity, writeIdentity } from "./identity";
import { communityPath, type CommunityEntry, type CommunityPage, type ReportReason } from "./types";

function read<T>(path: string): Promise<T> {
  return request<T>(path, { headers: readIdentity(), cache: "no-store" });
}

async function write<T>(path: string, method: string, payload?: object): Promise<T> {
  const result = await request<T>(path, { method, headers: await writeIdentity(), body: JSON.stringify(payload) });
  communityListMemory.page = null;
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

export function createPost(input: { title: string; body: string }, requestId: string): Promise<CommunityEntry> {
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

export function createComment(id: number, body: string, requestId: string): Promise<CommunityEntry> {
  return write(`${communityPath}/${id}/comments`, "POST", { body, requestId });
}

export function editComment(postId: number, id: number, body: string): Promise<CommunityEntry> {
  return write(`${communityPath}/${postId}/comments/${id}`, "PUT", { body });
}

export function deleteComment(postId: number, id: number): Promise<void> {
  return write(`${communityPath}/${postId}/comments/${id}`, "DELETE");
}

export function reportEntry(id: number, reason: ReportReason, detail: string, requestId: string): Promise<void> {
  return write(`/v1/public/community/entries/${id}/reports`, "POST", { reason, detail, requestId });
}

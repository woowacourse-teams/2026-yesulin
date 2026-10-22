import { auditionPostRoutes } from "@/features/audition-posts/types";
import type { AdminAuditionPost } from "./types";

/**
 * 운영자가 붙여 넣은 값에서 OTR 공고 번호를 꺼낸다. 번호만 넣거나 `https://otr.co.kr/audition/?vid=22397`처럼
 * 원문 주소를 그대로 붙여 넣어도 된다. 번호를 찾지 못하면 null이다.
 */
export function extractOtrId(value: string): string | null {
  const trimmed = value.trim();
  if (/^[0-9]{1,30}$/.test(trimmed)) return trimmed;
  const match = /[?&]vid=([0-9]{1,30})(?:&|#|$)/.exec(trimmed);
  return match ? match[1] : null;
}

export const adminAuditionPostRoutes = {
  list: "/admin/posts",
  owners: "/admin/posts?view=owners",
  companies: "/admin/posts?view=companies",
  editRequests: "/admin/posts?view=edit-requests",
  alertChat: "/admin/posts?view=alert-chat",
  byOwner: (ownerId: number) => `/admin/posts?owner=${ownerId}`,
  create: "/admin/posts/new",
  edit: (postId: number | string) => `/admin/posts/${encodeURIComponent(String(postId))}/edit`,
  preview: (postId: number | string) => `/admin/posts/${encodeURIComponent(String(postId))}/preview`,
} as const;

/** 공개 전·숨김 공고는 원문을 읽고, 원문 없는 공고는 관리자 전용 미리보기를 쓴다. */
export function adminAuditionPostReadLink(post: Pick<AdminAuditionPost, "id" | "status" | "sourceUrl">) {
  if (post.status === "PUBLISHED") return { href: auditionPostRoutes.detail(post.id), label: "공개 화면" };
  if (post.sourceUrl) return { href: post.sourceUrl, label: "원문" };
  return { href: adminAuditionPostRoutes.preview(post.id), label: "미리보기" };
}

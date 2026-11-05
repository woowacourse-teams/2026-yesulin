"use client";

import { createContext, use } from "react";
import type { CommunityNotice } from "@/features/community/types";

type Inbox = { items: readonly CommunityNotice[] | null; error: string; refresh: () => void; markRead: (id: number) => Promise<boolean> };
export const InboxContext = createContext<Inbox | null>(null);

export function useReceivedComments() {
  const inbox = use(InboxContext);
  if (!inbox) throw new Error("받은 댓글 컨텍스트가 필요합니다.");
  return inbox;
}

export function useUnreadCommentCount() {
  return use(InboxContext)?.items?.filter(item => !item.seen).length ?? 0;
}

export function UnreadCommentDot() {
  if (!useUnreadCommentCount()) return null;
  return <span className="received-comment-dot"><span className="sr-only">읽지 않은 댓글 있음</span></span>;
}

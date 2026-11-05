"use client";

import { createContext, use } from "react";
import type { CommunityNotice } from "@/features/community/types";

type Inbox = {
  items: readonly CommunityNotice[] | null;
  error: string;
  refresh: () => void;
  markRead: (id: number) => Promise<boolean>;
  markGroupRead: (ids: readonly number[]) => Promise<boolean>;
  markAllRead: () => Promise<boolean>;
};
export const InboxContext = createContext<Inbox | null>(null);

export function useReceivedComments() {
  const inbox = use(InboxContext);
  if (!inbox) throw new Error("받은 댓글 컨텍스트가 필요합니다.");
  return inbox;
}

export function useUnreadCommentCount() {
  return use(InboxContext)?.items?.filter(item => !item.seen).length ?? 0;
}


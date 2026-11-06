"use client";

import { useRef, useState } from "react";
import { relativeTime } from "@/features/community/time";
import { noticeHeadline, type NoticeGroup } from "@/features/community/notice-groups";
import { CommunityPhoto } from "./community-ui";
import { useReceivedComments } from "./received-comments-context";

export const communityNoticeRoute = "/community/notifications";

/** 알림을 누르면 묶인 알림을 모두 읽음으로 바꾸고 가장 최근 댓글로 이동한다. 실패하면 이동하지 않고 알린다. */
export function useOpenNotice() {
  const { markGroupRead } = useReceivedComments();
  const running = useRef(false);
  const [error, setError] = useState("");
  const open = async (group: NoticeGroup) => {
    if (running.current) return;
    running.current = true;
    setError("");
    const read = group.seen || await markGroupRead(group.commentIds).catch(() => false);
    running.current = false;
    if (!read) return setError("알림을 열지 못했어요. 잠시 후 다시 시도해 주세요.");
    window.location.assign(`/community/${group.postId}#comment-${group.latest.commentId}`);
  };
  return { open, error };
}

/** 모든 알림을 읽음으로 바꾼다. 필터와 관계없이 전체가 대상이며, 실패하면 안내 문구를 돌려준다. */
export function useMarkAllRead() {
  const { markAllRead } = useReceivedComments();
  const [error, setError] = useState("");
  const run = async () => {
    setError("");
    const done = await markAllRead().catch(() => false);
    if (!done) setError("모두 읽음으로 바꾸지 못했어요. 잠시 후 다시 시도해 주세요.");
  };
  return { run, error };
}

export function NoticeRow({ group, preview = false, onOpen }: {
  readonly group: NoticeGroup;
  readonly preview?: boolean;
  readonly onOpen: (group: NoticeGroup) => void;
}) {
  return (
    <li>
      <button type="button" className="notice-row" data-unread={!group.seen} onClick={() => onOpen(group)}>
        <CommunityPhoto label={group.latest.author} seed={`${group.postId}:${group.latest.author}`} />
        <span className="notice-row-body">
          <strong>{noticeHeadline(group)}</strong>
          <span className="notice-row-title">{group.title}</span>
          {preview && <span className="notice-row-preview">{group.latest.preview}</span>}
          <time dateTime={group.latest.createdAt}>{relativeTime(group.latest.createdAt)}</time>
        </span>
        {!group.seen && <span className="notice-row-dot"><span className="sr-only">읽지 않음</span></span>}
      </button>
    </li>
  );
}

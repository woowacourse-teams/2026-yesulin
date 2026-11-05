"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { PiBell } from "react-icons/pi";
import { getNotifications, readNotification } from "@/features/community/api";
import { useCommunityAction } from "@/features/community/hooks";
import type { CommunityNotice } from "@/features/community/types";
import { CommunitySheet } from "./community-sheet";
import { CommunityError } from "./community-ui";

export function CommunityInbox() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<readonly CommunityNotice[] | null>(null);
  const [error, setError] = useState("");
  const [attempt, retry] = useState(0);
  const action = useCommunityAction();
  useEffect(() => {
    let current = new AbortController();
    const refresh = () => {
      if (document.hidden) return;
      current.abort();
      current = new AbortController();
      const { signal } = current;
      void getNotifications(signal).then(page => {
        if (signal.aborted) return;
        setItems(page); setError("");
      }).catch(() => {
        if (signal.aborted) return;
        setItems(null); setError("댓글 알림을 불러오지 못했어요.");
      });
    };
    refresh();
    const timer = window.setInterval(refresh, 60_000);
    window.addEventListener("focus", refresh);
    return () => { current.abort(); clearInterval(timer); window.removeEventListener("focus", refresh); };
  }, [open, attempt]);
  const visit = (notice: CommunityNotice) => action.run(async () => {
    await readNotification(notice.commentId);
    router.push(`/community/${notice.postId}#comment-${notice.commentId}`);
  });
  const unread = items?.filter(item => !item.seen).length ?? 0;
  return <><button type="button" className="community-inbox-button" aria-haspopup="dialog" onClick={() => setOpen(true)}>
    <PiBell aria-hidden="true" />알림{unread > 0 && <strong aria-label={`읽지 않은 알림 ${unread}개`}>{unread}</strong>}
  </button><CommunitySheet label="댓글 알림" open={open} onClose={() => setOpen(false)}>
    <header className="community-inbox-head"><h2>댓글 알림</h2><button onClick={() => setOpen(false)}>닫기</button></header>
    <CommunityError message={error} retry={() => retry(value => value + 1)} />
    <CommunityError message={action.error} />
    {!items && !error && <p role="status">알림을 불러오는 중이에요.</p>}
    {items?.length === 0 && <p>아직 받은 댓글이 없어요.</p>}
    <ul className="community-inbox-items">{items?.map(item => <li key={item.commentId}>
      <button disabled={action.busy} onClick={() => void visit(item)}>
        <span>{!item.seen && <b>새 알림 · </b>}{item.replyToId && "내 댓글에 대댓글"}{!item.replyToId && "내 글에 댓글"}</span>
        <strong>{item.title}</strong>
      </button></li>)}</ul>
  </CommunitySheet></>;
}

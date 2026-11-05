"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { PiBell, PiChecks } from "react-icons/pi";
import { useAuthSession } from "@/components/auth/auth-session";
import { groupNotices } from "@/features/community/notice-groups";
import { communityNoticeRoute, NoticeRow, useMarkAllRead, useOpenNotice } from "./notice-row";
import { useReceivedComments, useUnreadCommentCount } from "./received-comments-context";

const PANEL_LIMIT = 5;

/** 배우 계정 헤더의 알림 종. 누르면 최근 알림을 펼치고, 전체 목록은 커뮤니티 알림 화면에서 본다. */
export function NotificationBell() {
  const { session } = useAuthSession();
  if (session?.role !== "APPLICANT") return null;
  return <BellButton />;
}

function BellButton() {
  const [open, setOpen] = useState(false);
  const unread = useUnreadCommentCount();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const closeToButton = useCallback(() => { setOpen(false); buttonRef.current?.focus(); }, []);
  const rootRef = useCloseOnOutside(open, close, closeToButton);
  return (
    <div ref={rootRef} className="notice-bell" onBlurCapture={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) close(); }}>
      <button ref={buttonRef} type="button" className="notice-bell-button" aria-expanded={open} aria-controls="notice-bell-panel"
        aria-label={bellLabel(unread)} onClick={() => setOpen(!open)}>
        <PiBell size={22} aria-hidden="true" />
        {unread > 0 && <span className="notice-bell-count num" aria-hidden="true">{countText(unread)}</span>}
      </button>
      {open && <BellPanel onNavigate={() => setOpen(false)} />}
    </div>
  );
}

function bellLabel(unread: number): string {
  if (unread > 0) return `알림 ${unread}개 읽지 않음`;
  return "알림";
}

function countText(unread: number): string {
  if (unread > 9) return "9+";
  return String(unread);
}

/** 바깥을 누르면 닫고, Escape로 닫으면 포커스를 종으로 돌려준다. */
function useCloseOnOutside(open: boolean, close: () => void, closeToButton: () => void) {
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) close(); };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") closeToButton(); };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", escape); };
  }, [open, close, closeToButton]);
  return rootRef;
}

function BellPanel({ onNavigate }: { readonly onNavigate: () => void }) {
  const { items, error } = useReceivedComments();
  const unread = useUnreadCommentCount();
  const notice = useOpenNotice();
  const readAll = useMarkAllRead();
  const groups = groupNotices(items ?? []).slice(0, PANEL_LIMIT);
  return (
    <section id="notice-bell-panel" className="notice-panel" aria-labelledby="notice-panel-title">
      <header>
        <h2 id="notice-panel-title">알림</h2>
        <button type="button" onClick={() => void readAll.run()} disabled={unread === 0}>
          <PiChecks aria-hidden="true" />모두 읽음
        </button>
      </header>
      <PanelBody loading={!items && !error} error={error || notice.error || readAll.error} empty={items?.length === 0} />
      <ul>{groups.map((group) => <NoticeRow key={group.key} group={group} onOpen={notice.open} />)}</ul>
      <Link href={communityNoticeRoute} className="notice-panel-more" onClick={onNavigate}>알림 전체 보기</Link>
    </section>
  );
}

function PanelBody({ loading, error, empty }: { readonly loading: boolean; readonly error: string; readonly empty: boolean }) {
  if (error) return <p role="alert" className="notice-panel-state">{error}</p>;
  if (loading) return <p role="status" className="notice-panel-state">알림을 불러오는 중이에요.</p>;
  if (empty) return <p className="notice-panel-state">아직 받은 알림이 없어요. 글이나 댓글에 답이 오면 여기서 알려 드려요.</p>;
  return null;
}

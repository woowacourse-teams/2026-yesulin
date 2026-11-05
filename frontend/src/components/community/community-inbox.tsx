"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAuthSession } from "@/components/auth/auth-session";
import { ApplicantPageContainer } from "@/components/applicants/applicant-page-container";
import { WorkspaceBreadcrumb } from "@/components/landing/workspace-page-heading";
import { applicantRoutes } from "@/features/applicants/routes";
import { useCommunityAction, useCurrentCommunityForm } from "@/features/community/hooks";
import type { CommunityNotice } from "@/features/community/types";
import { useReceivedComments } from "./received-comments-context";

export function CommunityInbox() {
  const { session } = useAuthSession();
  if (session?.role === "APPLICANT") return <InboxList />;
  return <ApplicantPageContainer><Link href={`/login?returnTo=${applicantRoutes.receivedComments}`}>로그인하고 받은 댓글 보기</Link></ApplicantPageContainer>;
}

function InboxList() {
  const { items, error, refresh, markRead } = useReceivedComments();
  const action = useCommunityAction();
  useEffect(refresh, [refresh]);
  const mounted = useCurrentCommunityForm();
  const visit = (notice: CommunityNotice) => action.run(async () => {
    if (!notice.seen && !await markRead(notice.commentId)) return;
    if (mounted.current) window.location.assign(`/community/${notice.postId}#comment-${notice.commentId}`);
  });
  return <ApplicantPageContainer>
    <WorkspaceBreadcrumb items={[{ label: "마이페이지", href: applicantRoutes.home }, { label: "받은 댓글" }]} />
    <section className="received-comments" aria-labelledby="received-title">
      <h1 id="received-title">받은 댓글</h1>
      {error && <p role="alert">{error} <button type="button" onClick={refresh}>다시 시도</button></p>}
      {action.error && <p role="alert">{action.error}</p>}
      {!items && !error && <p role="status">받은 댓글을 불러오는 중이에요.</p>}
      {items?.length === 0 && <p>아직 받은 댓글이 없어요.</p>}
      <ul>{items?.map(item => <li key={item.commentId}>
        <button disabled={action.busy} onClick={() => void visit(item)}>
          <span>{!item.seen && <span className="received-comment-dot"><span className="sr-only">읽지 않음</span></span>}
            {item.replyToId && "내 댓글에 대댓글"}{!item.replyToId && "내 글에 댓글"}</span>
          <strong>{item.title}</strong>
        </button></li>)}</ul>
    </section>
  </ApplicantPageContainer>;
}

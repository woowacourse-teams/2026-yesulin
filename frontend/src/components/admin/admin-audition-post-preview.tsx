"use client";

import { useEffect, useState } from "react";
import { AuditionPostContent } from "@/components/audition-posts/audition-post-content";
import { AuditionPostStatusBadge } from "@/components/audition-posts/audition-post-status-badge";
import { AdminApiError, fetchAuditionPostForEdit } from "@/features/admin/api";
import { adminAuditionPostRoutes } from "@/features/admin/audition-posts";
import type { EditableAuditionPost } from "@/features/audition-posts/editing";
import { AdminActionButton, AdminActionLink, AdminEmptyState, AdminShell } from "./admin-shell";
import { AdminSessionEnded } from "./admin-session-ended";

type State =
  | { readonly phase: "loading" }
  | { readonly phase: "ready"; readonly post: EditableAuditionPost }
  | { readonly phase: "unauthorized" | "missing" }
  | { readonly phase: "failed"; readonly message: string };

/** 원문 없는 비공개 공고를 관리자 세션으로 읽는다. 공개 조회수는 기록하지 않는다. */
export function AdminAuditionPostPreview({ postId }: { readonly postId: string }) {
  const [state, setState] = useState<State>({ phase: "loading" });
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    fetchAuditionPostForEdit(postId)
      .then((post) => { if (active) setState({ phase: "ready", post }); })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403)) {
          setState({ phase: "unauthorized" });
        } else if (cause instanceof AdminApiError && cause.status === 404) {
          setState({ phase: "missing" });
        } else {
          setState({ phase: "failed", message: cause instanceof Error ? cause.message : "공고를 불러오지 못했어요." });
        }
      });
    return () => { active = false; };
  }, [postId, reloadToken]);

  if (state.phase === "unauthorized") return <AdminSessionEnded />;

  return (
    <AdminShell current="posts" layout="form" title="공고 미리보기" description="관리자에게만 보이는 미리보기입니다."
      actions={<AdminActionLink href={adminAuditionPostRoutes.list}>공고 목록</AdminActionLink>}
    >
      {state.phase === "loading" ? <p role="status" className="text-sm text-muted">공고를 불러오는 중이에요.</p> : null}
      {state.phase === "missing" ? <AdminEmptyState title="공고를 찾을 수 없어요" description="삭제되었거나 존재하지 않는 공고입니다." /> : null}
      {state.phase === "failed" ? (
        <div role="alert" className="rounded-card border border-fail/30 bg-fail-bg p-5 text-sm text-fail">
          <p>{state.message}</p>
          <AdminActionButton className="mt-3" onClick={() => setReloadToken((value) => value + 1)}>다시 시도</AdminActionButton>
        </div>
      ) : null}
      {state.phase === "ready" ? (
        <article className="overflow-hidden rounded-card border border-border bg-card">
          <header className="border-b border-border-soft px-5 py-6 sm:px-8">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <AuditionPostStatusBadge status={state.post.status} />
              <span className="font-semibold text-brand">{state.post.category}</span>
            </div>
            <h2 className="mt-3 break-words text-2xl font-bold leading-snug">{state.post.title}</h2>
            <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
              {[['작성', state.post.owner?.companyName || state.post.authorName], ['페이', state.post.pay], ['마감', state.post.deadlineText]].map(([label, value]) => (
                <div key={label} className="min-w-0"><dt className="text-muted">{label}</dt><dd className="mt-1 break-words font-medium">{value || "미기재"}</dd></div>
              ))}
            </dl>
          </header>
          <AuditionPostContent post={state.post} />
        </article>
      ) : null}
    </AdminShell>
  );
}

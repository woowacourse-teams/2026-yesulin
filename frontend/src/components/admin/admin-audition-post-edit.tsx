"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { AdminApiError, fetchAuditionPostForEdit, updateAuditionPost } from "@/features/admin/api";
import { adminAuditionPostRoutes } from "@/features/admin/audition-posts";
import type { AdminAuditionPostDetail, AdminAuditionPostWrite } from "@/features/admin/types";
import { auditionPostRoutes } from "@/features/audition-posts/types";
import { formatDateTime } from "./admin-format";
import { AuditionPostForm } from "./admin-audition-post-form";
import { AdminSessionEnded } from "./admin-session-ended";
import { AdminActionLink, AdminShell } from "./admin-shell";

type Phase = "loading" | "ready" | "missing" | "failed" | "unauthorized";

function isAuthError(cause: unknown) {
  return cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403);
}

/**
 * 운영자가 공고의 분류·제목·페이·마감·작성자·태그·본문과 사진·첨부를 고친다. 저장하면 저장된 내용을 다시 불러와
 * 폼을 새로 채운다. 공개 상태는 바꾸지 않는다.
 */
export function AdminAuditionPostEdit({ postId, created = false }: {
  readonly postId: string;
  /** 직접 쓰기 화면에서 막 만든 뒤 들어왔으면 true. */
  readonly created?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [post, setPost] = useState<AdminAuditionPostDetail | null>(null);
  const [notice, setNotice] = useState<string | undefined>(
    created ? "숨김으로 만들었어요. 목록에서 '보여주기'를 누르면 공개돼요." : undefined,
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    fetchAuditionPostForEdit(postId)
      .then((next) => {
        if (!active) return;
        setPost(next);
        setPhase("ready");
      })
      .catch((cause: unknown) => {
        if (!active) return;
        if (isAuthError(cause)) {
          setPhase("unauthorized");
          return;
        }
        if (cause instanceof AdminApiError && cause.status === 404) {
          setPhase("missing");
          return;
        }
        setLoadError(cause instanceof Error ? cause.message : "공고를 불러오지 못했습니다.");
        setPhase("failed");
      });
    return () => { active = false; };
  }, [postId, reloadToken]);

  const save = useCallback(async (write: AdminAuditionPostWrite) => {
    try {
      await updateAuditionPost(postId, write);
    } catch (cause) {
      if (isAuthError(cause)) {
        setPhase("unauthorized");
        return;
      }
      throw cause;
    }
    try {
      setPost(await fetchAuditionPostForEdit(postId));
      setNotice("저장했어요.");
    } catch {
      throw new Error("저장했지만 저장된 내용을 다시 불러오지 못했어요. 새로고침해 주세요.");
    }
  }, [postId]);

  if (phase === "unauthorized") return <AdminSessionEnded />;

  return (
    <AdminShell
      current="posts"
      layout="form"
      title="공고 수정"
      description="공개 중인 공고는 저장하면 바로 반영돼요. OTR 원문으로 다시 가져오면 수정한 내용이 교체됩니다."
      actions={<AdminActionLink href={adminAuditionPostRoutes.list}>목록으로</AdminActionLink>}
    >
      {phase === "loading" ? <p role="status" className="text-sm text-muted">공고를 불러오는 중이에요.</p> : null}
      {phase === "missing" ? (
        <p className="rounded-card border border-border bg-card px-4 py-8 text-center text-sm text-muted">
          공고를 찾을 수 없어요. <Link href={adminAuditionPostRoutes.list} className="font-semibold text-brand underline underline-offset-2">목록으로 돌아가기</Link>
        </p>
      ) : null}
      {phase === "failed" ? (
        <p role="alert" className="rounded-control border border-fail/30 bg-fail-bg px-4 py-3 text-sm text-fail">
          {loadError} <button type="button" onClick={() => setReloadToken((value) => value + 1)} className="font-semibold underline">다시 시도</button>
        </p>
      ) : null}

      {phase === "ready" && post ? (
        <>
          <PostSummary post={post} />
          {/* 저장할 때마다 서버가 정리한 내용으로 폼과 편집기를 새로 채운다. */}
          <AuditionPostForm key={post.updatedAt} post={post} notice={notice} submitLabel="저장" onSubmit={save} />
        </>
      ) : null}
    </AdminShell>
  );
}

function PostSummary({ post }: { readonly post: AdminAuditionPostDetail }) {
  return (
    <section aria-label="공고 출처와 상태" className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-border bg-card px-4 py-3 text-sm sm:px-5">
      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${post.status === "PUBLISHED" ? "bg-pass-bg text-pass" : "bg-border-soft text-muted-strong"}`}>
        {post.status === "PUBLISHED" ? "공개 중" : "숨김"}
      </span>
      <span className="num text-muted">{post.externalId ? `${post.source} ${post.externalId}` : "직접 작성"}</span>
      <span className="text-muted">{post.editedAt ? `마지막 수정 ${formatDateTime(post.editedAt)}` : "고친 적 없음"}</span>
      <span className="ml-auto flex flex-wrap gap-3">
        {post.sourceUrl ? (
          <a href={post.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand underline underline-offset-2">원문</a>
        ) : null}
        {post.status === "PUBLISHED" ? (
          <Link href={auditionPostRoutes.detail(post.id)} target="_blank" className="font-semibold text-brand underline underline-offset-2">공개 화면</Link>
        ) : null}
      </span>
    </section>
  );
}

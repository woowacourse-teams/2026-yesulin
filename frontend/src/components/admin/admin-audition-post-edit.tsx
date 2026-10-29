"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useState } from "react";
import { AuditionPostStatusBadge } from "@/components/audition-posts/audition-post-status-badge";
import { AuditionPostForm } from "@/components/audition-posts/editor/audition-post-form";
import { FieldSelect } from "@/components/ui/controls";
import {
  AdminApiError,
  changeAuditionPostOwner,
  fetchAuditionPostForEdit,
  fetchProducers,
  linkAuditionPostAuthor,
  updateAuditionPost,
  uploadAuditionPostFile,
} from "@/features/admin/api";
import { adminAuditionPostRoutes } from "@/features/admin/audition-posts";
import type { AdminProducer } from "@/features/admin/types";
import type { AuditionPostWrite, EditableAuditionPost } from "@/features/audition-posts/editing";
import { auditionPostRoutes } from "@/features/audition-posts/types";
import { formatDateTime } from "./admin-format";
import { AdminSessionEnded } from "./admin-session-ended";
import { AdminActionButton, AdminActionLink, AdminShell } from "./admin-shell";

type Phase = "loading" | "ready" | "missing" | "failed" | "unauthorized";

function isAuthError(cause: unknown) {
  return cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403);
}

/**
 * 운영자가 공고의 분류·제목·페이·마감·작성자·태그·본문과 사진·첨부를 고친다. 저장하면 저장된 내용을 다시 불러와
 * 폼을 새로 채운다. 공개 상태는 바꾸지 않는다. 공고를 기획사 계정에 연결하면 그 기획사가 직접 고칠 수 있다.
 */
export function AdminAuditionPostEdit({ postId, created = false }: {
  readonly postId: string;
  /** 직접 쓰기 화면에서 막 만든 뒤 들어왔으면 true. */
  readonly created?: boolean;
}) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [post, setPost] = useState<EditableAuditionPost | null>(null);
  const [notice, setNotice] = useState<string | undefined>(
    created ? "검토 전으로 만들었어요. 업체 계정을 연결하고, 목록에서 '공개하기'를 누르면 공개돼요." : undefined,
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

  const save = useCallback(async (write: AuditionPostWrite) => {
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
          <OwnerPanel
            post={post}
            onChanged={(changes) => setPost((current) => (current ? { ...current, ...changes } : current))}
            onUnauthorized={() => setPhase("unauthorized")}
          />
          {/* 저장할 때마다 서버가 정리한 내용으로 폼과 편집기를 새로 채운다. */}
          <AuditionPostForm
            key={post.updatedAt}
            post={post}
            notice={notice}
            submitLabel="저장"
            uploadFile={uploadAuditionPostFile}
            onSubmit={save}
          />
        </>
      ) : null}
    </AdminShell>
  );
}

function PostSummary({ post }: { readonly post: EditableAuditionPost }) {
  return (
    <section aria-label="공고 출처와 상태" className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-border bg-card px-4 py-3 text-sm sm:px-5">
      <AuditionPostStatusBadge status={post.status} />
      <span className="num text-muted">{post.externalId ? `${post.source} ${post.externalId}` : "원문 없음"}</span>
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

function ownerLabel(producer: AdminProducer) {
  return `${producer.companyName ?? "회사명 없음"} · ${producer.email} · 회원 #${producer.memberId}${producer.status === "PENDING" ? " (이메일 인증 대기)" : ""}`;
}

/**
 * 공고를 기획사 계정에 연결하거나 연결을 끊는다. 연결된 기획사는 자기 공고 목록에서 이 공고를 고칠 수 있다.
 * OTR 회원 번호가 있는 공고는 연결하면서 같은 작성자의 다른 공고와 앞으로 가져올 공고도 자동으로 연결할 수 있다.
 * 기획사 목록은 연결하려고 할 때만 불러온다.
 */
function OwnerPanel({ post, onChanged, onUnauthorized }: {
  readonly post: EditableAuditionPost;
  readonly onChanged: (changes: Partial<Pick<EditableAuditionPost, "owner" | "authorLink">>) => void;
  readonly onUnauthorized: () => void;
}) {
  const selectId = useId();
  const [linkAuthor, setLinkAuthor] = useState(false);
  const canLinkAuthor = post.sourceAuthorId !== null && post.authorLink === null;
  const [producers, setProducers] = useState<readonly AdminProducer[] | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fail = (cause: unknown, fallback: string) => {
    if (isAuthError(cause)) {
      onUnauthorized();
      return;
    }
    setError(cause instanceof Error ? cause.message : fallback);
  };

  const startChoosing = async () => {
    setChoosing(true);
    setError(null);
    if (producers) return;
    try {
      setProducers(await fetchProducers());
    } catch (cause) {
      fail(cause, "기획사 목록을 불러오지 못했어요.");
      setChoosing(false);
    }
  };

  const change = async (ownerId: number | null) => {
    setBusy(true);
    setError(null);
    try {
      const result = await changeAuditionPostOwner(post.id, ownerId);
      onChanged({ owner: result.ownerId === null ? null : { memberId: result.ownerId, companyName: result.ownerName } });
      if (ownerId !== null && linkAuthor && canLinkAuthor && post.sourceAuthorId) {
        const authorLink = await linkAuditionPostAuthor(post.source, post.sourceAuthorId, ownerId);
        onChanged({ authorLink: { id: authorLink.id, ownerId, companyName: authorLink.ownerName } });
      }
      setChoosing(false);
      setSelected("");
      setLinkAuthor(false);
    } catch (cause) {
      fail(cause, "기획사 연결을 바꾸지 못했어요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby={`${selectId}-title`} className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-card border border-border bg-card px-4 py-3 text-sm sm:px-5">
      <h2 id={`${selectId}-title`} className="font-bold">공고를 관리할 가입 회원</h2>
      <span className={post.owner ? "font-semibold text-foreground" : "text-muted"}>
        {post.owner ? post.owner.companyName ?? `회원 ${post.owner.memberId}` : "없음"}
      </span>
      {choosing ? (
        <span className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
          <label htmlFor={selectId} className="sr-only">연결할 가입 회원</label>
          <FieldSelect id={selectId} value={selected} disabled={busy || !producers} onChange={(event) => setSelected(event.target.value)} className="min-w-0 flex-1 sm:w-72 sm:flex-none">
            <option value="" disabled>{producers ? "가입 회원을 골라 주세요" : "불러오는 중…"}</option>
            {producers?.map((producer) => (
              <option key={producer.memberId} value={producer.memberId}>{ownerLabel(producer)}</option>
            ))}
          </FieldSelect>
          <AdminActionButton tone="primary" disabled={busy || !selected} onClick={() => void change(Number(selected))}>연결</AdminActionButton>
          <AdminActionButton disabled={busy} onClick={() => setChoosing(false)}>취소</AdminActionButton>
          {canLinkAuthor ? (
            <label className="flex w-full items-start gap-2 text-sm">
              <input type="checkbox" checked={linkAuthor} disabled={busy} onChange={(event) => setLinkAuthor(event.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-brand" />
              <span>같은 OTR 작성자({post.authorName} #{post.sourceAuthorId})의 다른 공고와 앞으로 가져올 공고도 이 회원에게 연결</span>
            </label>
          ) : null}
        </span>
      ) : (
        <span className="ml-auto flex flex-wrap gap-2">
          {post.owner ? <AdminActionButton disabled={busy} onClick={() => void change(null)}>연결 끊기</AdminActionButton> : null}
          <AdminActionButton disabled={busy} onClick={() => void startChoosing()}>{post.owner ? "다른 회원으로" : "가입 회원 연결"}</AdminActionButton>
        </span>
      )}
      {post.authorLink ? (
        <p className="w-full text-sm text-muted-strong">
          OTR 작성자 #{post.sourceAuthorId}는 <strong className="font-semibold">{post.authorLink.companyName ?? `회원 ${post.authorLink.ownerId}`}</strong>에 자동 연결돼 있어요.
          {" "}<Link href={adminAuditionPostRoutes.owners} className="font-semibold text-brand underline underline-offset-2">회원 연결</Link>에서 해제할 수 있어요.
        </p>
      ) : null}
      <p className="w-full text-xs text-muted">연결한 회원은 로그인 후 ‘내 오디션 공고’에서 이 공고를 확인하고 수정할 수 있어요.</p>
      {error ? <p role="alert" className="w-full text-sm text-fail">{error}</p> : null}
    </section>
  );
}

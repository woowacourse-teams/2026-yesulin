"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createComment, deleteComment, editComment, getComments } from "@/features/community/api";
import { normalizeComment, SubmissionAttempt } from "@/features/community/draft";
import { useCommunityAction, useCommunityFeed, useDraftGuard } from "@/features/community/hooks";
import type { CommunityEntry } from "@/features/community/types";
import { BrowserOwnershipNotice, CommunityAuthor, CommunityError, PlainText } from "./community-ui";
import { ReportForm } from "./report-form";

type CommentsProps = { readonly postId: number; readonly count: number; readonly onChanged: () => Promise<void> };

export function CommunityComments({ postId, count, onChanged }: CommentsProps) {
  const loader = useCallback((cursor?: number) => getComments(postId, cursor ?? linkedCommentCursor()), [postId]);
  const feed = useCommunityFeed(loader);
  const focused = useRef(false);
  useEffect(() => {
    if (focused.current || !isCommentAnchor(window.location.hash)) return;
    const target = document.getElementById(window.location.hash.slice(1));
    if (!target) return;
    target.scrollIntoView({ block: "center" });
    focused.current = true;
  }, [feed.items]);
  const changed = async (createdId?: number) => { await Promise.all([feed.load(newCommentCursor(createdId), true), onChanged()]); };
  return <section className="community-comments" aria-labelledby="comments-heading"><h2 id="comments-heading">댓글 {count}</h2>
    <CommentEditor postId={postId} onSaved={changed} />
    <button className="community-text-button" disabled={feed.loading} onClick={() => {
      window.history.replaceState(window.history.state, "", window.location.pathname);
      void feed.load();
    }}>댓글 처음부터 보기</button>
    {!feed.loading && !feed.error && !feed.items.length && <p className="community-empty">첫 댓글을 남겨 주세요.</p>}
    <ol>{feed.items.map(comment => <CommentItem key={`${comment.id}-${comment.updatedAt}`} comment={comment} postId={postId} onChanged={changed} />)}</ol>
    <CommunityError message={feed.error} retry={() => void feed.load(feed.cursor ?? undefined)} />
    {feed.loading && <p role="status">댓글을 불러오고 있어요.</p>}
    {feed.cursor !== null && <button className="community-button" disabled={feed.loading} onClick={() => void feed.load(feed.cursor!)}>댓글 더 보기</button>}</section>;
}

type EditorProps = { readonly postId: number; readonly comment?: CommunityEntry; readonly onSaved: (createdId?: number) => Promise<void>; readonly onCancel?: () => void };

function CommentEditor({ postId, comment, onSaved, onCancel }: EditorProps) {
  const action = useCommunityAction();
  const attempt = useRef(new SubmissionAttempt());
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  useDraftGuard(dirty);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const body = String(new FormData(form).get("body") ?? "");
    await action.run(async () => {
      const input = normalizeComment(body);
      const result = await saveComment(postId, comment, input.body, attempt.current.idFor(input));
      form.reset(); setDirty(false); setSaved(true); attempt.current.reset();
      await onSaved(result.id);
    });
  }
  const inputId = `comment-body-${comment?.id ?? "new"}`;
  return <form className="community-editor community-comment-editor" onSubmit={submit} onChange={() => { setDirty(true); setSaved(false); }}>
    <fieldset disabled={action.busy}><label htmlFor={inputId}>댓글 <span>최대 1,000자</span></label>
      <textarea id={inputId} name="body" required maxLength={1000} rows={3} defaultValue={comment?.body ?? ""} placeholder="익명으로 댓글을 남겨 주세요." /></fieldset>
    {!comment && <BrowserOwnershipNotice />}<CommunityError message={action.error} />
    <div className="community-actions">{onCancel && <button type="button" className="community-button" disabled={action.busy} onClick={() => { if (!dirty || window.confirm("수정을 취소할까요?")) onCancel(); }}>취소</button>}
      <button className="community-button community-primary" disabled={action.busy}>{action.busy && "저장 중…"}{!action.busy && "댓글 저장"}</button></div>
    {saved && <p role="status">댓글을 저장했어요.</p>}</form>;
}

function saveComment(postId: number, comment: CommunityEntry | undefined, body: string, requestId: string) {
  if (comment) return editComment(postId, comment.id, body);
  return createComment(postId, body, requestId);
}

type ItemProps = { readonly comment: CommunityEntry; readonly postId: number; readonly onChanged: () => Promise<void> };

function CommentItem({ comment, postId, onChanged }: ItemProps) {
  const [editing, setEditing] = useState(false);
  const action = useCommunityAction();
  async function remove() {
    if (!window.confirm("댓글을 삭제할까요?")) return;
    await action.run(async () => { await deleteComment(postId, comment.id); await onChanged(); });
  }
  if (editing) return <li id={`comment-${comment.id}`}><CommentEditor postId={postId} comment={comment} onCancel={() => setEditing(false)} onSaved={async () => { setEditing(false); await onChanged(); }} /></li>;
  return <li id={`comment-${comment.id}`} className="community-comment"><CommunityAuthor createdAt={comment.createdAt} updatedAt={comment.updatedAt} />
    <PlainText text={comment.body ?? ""} /><div className="community-actions">{comment.editable && <>
      <button className="community-button" disabled={action.busy} onClick={() => setEditing(true)}>댓글 수정</button>
      <button className="community-button" disabled={action.busy} onClick={remove}>댓글 삭제</button></>}</div>
    <CommunityError message={action.error} /><ReportForm entryId={comment.id} /></li>;
}

function linkedCommentCursor() {
  const match = /^#comment-(\d+)$/.exec(window.location.hash);
  if (!match) return 0;
  const id = Number(match[1]);
  if (!Number.isSafeInteger(id) || id < 1) return 0;
  return id - 1;
}

function newCommentCursor(id?: number) {
  if (id) return id - 1;
  return undefined;
}

function isCommentAnchor(hash: string) {
  return hash === "#comments-heading" || /^#comment-\d+$/.test(hash);
}

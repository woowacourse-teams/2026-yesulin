"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { PiArrowUp } from "react-icons/pi";
import { createComment, deleteComment, editComment, getComments } from "@/features/community/api";
import { normalizeComment, SubmissionAttempt } from "@/features/community/draft";
import { useCommunityAction, useCommunityFeed, useDraftGuard } from "@/features/community/hooks";
import type { CommunityEntry } from "@/features/community/types";
import { AnonymousAvatar, CommunityByline, CommunityError, PlainText } from "./community-ui";
import { EntryMenu } from "./entry-menu";

const COMMENT_LIMIT = 1000;

type Notify = (message: string) => void;
type CommentsProps = { readonly postId: number; readonly count: number; readonly notify: Notify; readonly onChanged: () => Promise<void> };

export function CommunityComments({ postId, count, notify, onChanged }: CommentsProps) {
  const loader = useCallback((cursor?: number) => getComments(postId, cursor ?? linkedCommentCursor()), [postId]);
  const feed = useCommunityFeed(loader);
  const [partial, setPartial] = useState(() => linkedCommentCursor() > 0);
  const focused = useRef(false);
  useEffect(() => {
    if (focused.current || !isCommentAnchor(window.location.hash)) return;
    const target = document.getElementById(window.location.hash.slice(1));
    if (!target) return;
    target.scrollIntoView({ block: "center" });
    focused.current = true;
  }, [feed.items]);
  const changed = async () => { await Promise.all([feed.load(undefined, true), onChanged()]); };
  const created = async (id: number) => {
    await Promise.all([feed.load(lastLoadedId(feed.items)), onChanged()]);
    document.getElementById(`comment-${id}`)?.scrollIntoView({ block: "nearest" });
  };
  return <><section className="community-comments" aria-labelledby="comments-heading">
    <h2 id="comments-heading" className="community-comments-head">댓글 {count}</h2>
    {partial && <EarlierComments disabled={feed.loading} load={() => {
      window.history.replaceState(window.history.state, "", window.location.pathname);
      setPartial(false);
      void feed.load();
    }} />}
    {!feed.loading && !feed.error && !feed.items.length && <p className="community-comments-empty">첫 댓글을 남겨 주세요.</p>}
    <ol>{feed.items.map(comment => <CommentItem key={`${comment.id}-${comment.updatedAt}`} comment={comment} postId={postId}
      notify={notify} onChanged={changed} />)}</ol>
    <CommunityError message={feed.error} retry={() => void feed.load(feed.cursor ?? undefined)} />
    {feed.loading && <p className="community-status" role="status">댓글을 불러오고 있어요.</p>}
    {!feed.loading && feed.cursor !== null && <button type="button" className="community-more" onClick={() => void feed.load(feed.cursor!)}>댓글 더 보기</button>}
  </section><CommentComposer postId={postId} onSaved={created} /></>;
}

function EarlierComments({ disabled, load }: { readonly disabled: boolean; readonly load: () => void }) {
  return <button type="button" className="community-earlier" disabled={disabled} onClick={load} aria-label="이전 댓글 보기">
    <span className="community-earlier-dots" aria-hidden="true">···</span><span aria-hidden="true">이전 댓글</span></button>;
}

function useCommentSubmit(postId: number, comment: CommunityEntry | undefined, onSaved: (id: number) => Promise<void>) {
  const action = useCommunityAction();
  const attempt = useRef(new SubmissionAttempt());
  const submit = (body: string, done: () => void) => action.run(async () => {
    const input = normalizeComment(body);
    const result = await saveComment(postId, comment, input.body, attempt.current.idFor(input));
    done();
    attempt.current.reset();
    await onSaved(result.id);
  });
  return { action, submit };
}

type ComposerProps = { readonly postId: number; readonly onSaved: (id: number) => Promise<void> };

function CommentComposer({ postId, onSaved }: ComposerProps) {
  const [body, setBody] = useState("");
  const [focused, setFocused] = useState(false);
  const { action, submit } = useCommentSubmit(postId, undefined, onSaved);
  useDraftGuard(body !== "");
  const send = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void submit(body, () => { setBody(""); setFocused(false); }); };
  const expanded = focused || body !== "";
  return <form className="community-comment-composer" data-expanded={expanded} onSubmit={send}
    onFocus={() => setFocused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <fieldset disabled={action.busy}><label htmlFor="comment-body-new" className="community-sr-only">댓글</label>
      <textarea id="comment-body-new" name="body" required maxLength={COMMENT_LIMIT} rows={composerRows(expanded)} value={body}
        onChange={event => setBody(event.target.value)} onKeyDown={submitOnEnter} placeholder="익명으로 댓글 남기기" />
      <button className="community-send" aria-label="댓글 올리기"><PiArrowUp size={18} aria-hidden="true" /></button></fieldset>
    <CommunityError message={action.error} />
    {expanded && <p className="community-count">{body.length.toLocaleString()} / 1,000자</p>}</form>;
}

type EditProps = { readonly postId: number; readonly comment: CommunityEntry; readonly onSaved: () => Promise<void>; readonly onCancel: () => void };

function CommentEditForm({ postId, comment, onSaved, onCancel }: EditProps) {
  const [body, setBody] = useState(comment.body ?? "");
  const { action, submit } = useCommentSubmit(postId, comment, onSaved);
  useDraftGuard(body !== comment.body);
  const save = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); void submit(body, () => {}); };
  const cancel = () => { if (body === comment.body || window.confirm("수정을 취소할까요?")) onCancel(); };
  return <form className="community-comment-edit" onSubmit={save}><fieldset disabled={action.busy}>
    <label htmlFor={`comment-body-${comment.id}`} className="community-sr-only">댓글 수정</label>
    <textarea id={`comment-body-${comment.id}`} name="body" autoFocus required maxLength={COMMENT_LIMIT} rows={3} value={body} onChange={event => setBody(event.target.value)} onKeyDown={submitOnEnter} /></fieldset>
    <CommunityError message={action.error} />
    <div className="community-edit-buttons"><button type="button" disabled={action.busy} onClick={cancel}>취소</button>
      <button className="community-primary-button" disabled={action.busy}>{action.busy && "저장 중…"}{!action.busy && "저장"}</button></div></form>;
}

function composerRows(expanded: boolean) {
  if (expanded) return 3;
  return 1;
}

function saveComment(postId: number, comment: CommunityEntry | undefined, body: string, requestId: string) {
  if (comment) return editComment(postId, comment.id, body);
  return createComment(postId, body, requestId);
}

type ItemProps = { readonly comment: CommunityEntry; readonly postId: number; readonly notify: Notify; readonly onChanged: () => Promise<void> };

function CommentItem({ comment, postId, notify, onChanged }: ItemProps) {
  const [editing, setEditing] = useState(false);
  const remove = async () => { await deleteComment(postId, comment.id); await onChanged(); };
  return <li id={`comment-${comment.id}`} className="community-comment"><AnonymousAvatar author={comment.author} small />
    <div className="community-entry-main"><div className="community-entry-head"><CommunityByline author={comment.author} createdAt={comment.createdAt} updatedAt={comment.updatedAt} markWriter />
      {!editing && <EntryMenu entry={comment} label={`${comment.author} 댓글 메뉴`} notify={notify} onEdit={() => setEditing(true)} onDelete={remove} deleteQuestion="댓글을 삭제할까요?" />}</div>
      {editing && <CommentEditForm postId={postId} comment={comment} onCancel={() => setEditing(false)} onSaved={async () => { setEditing(false); await onChanged(); }} />}
      {!editing && <PlainText text={comment.body ?? ""} />}</div></li>;
}

function linkedCommentCursor() {
  const match = /^#comment-(\d+)$/.exec(window.location.hash);
  if (!match) return 0;
  const id = Number(match[1]);
  if (!Number.isSafeInteger(id) || id < 1) return 0;
  return id - 1;
}

function lastLoadedId(items: readonly CommunityEntry[]) {
  return items.at(-1)?.id;
}

function submitOnEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
  if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
  event.preventDefault();
  event.currentTarget.form?.requestSubmit();
}

function isCommentAnchor(hash: string) {
  return hash === "#comments-heading" || /^#comment-\d+$/.test(hash);
}

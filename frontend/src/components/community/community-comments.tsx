"use client";

import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref, type FormEvent, type KeyboardEvent } from "react";
import { commentThreads, linkedCommentPage } from "@/features/community/comments";
import { createComment, deleteComment, editComment, getComments } from "@/features/community/api";
import { trackCommentCreated } from "@/features/community/analytics";
import { normalizeComment } from "@/features/community/draft";
import { useCommunityAction, useCommunityFeed, useCurrentCommunityForm, useDraftGuard } from "@/features/community/hooks";
import { communityCommentEditReturnTo, communityReturnTo, finishCommunityEdit } from "@/features/community/navigation";
import { useMemberDraft } from "@/features/community/use-member-draft";
import type { CommunityEntry, CommunityParticipation } from "@/features/community/types";
import { CommunityPhoto, CommunityByline, CommunityError, PlainText } from "./community-ui";
import { AuthorChoice, CommunityLogin, MemberParticipation } from "./member-participation";
import { EntryMenu } from "./entry-menu";

const COMMENT_LIMIT = 1000;

type Notify = (message: string) => void;
type CommentsProps = { readonly postId: number; readonly count: number; readonly notify: Notify; readonly onChanged: () => Promise<void> };

export function CommunityComments({ postId, count, notify, onChanged }: CommentsProps) {
  const loader = useCallback((cursor?: number) => {
    if (cursor !== undefined) return getComments(postId, cursor);
    const after = linkedCommentCursor();
    if (after > 0) return linkedCommentPage(position => getComments(postId, position), after);
    return getComments(postId);
  }, [postId]);
  const feed = useCommunityFeed(loader);
  const [partial, setPartial] = useState(() => linkedCommentCursor() > 0);
  const [replyToId, setReplyToId] = useState(() => queryCommentId("replyTo"));
  const [sending, setSending] = useState(false);
  const discardDraft = useRef<() => boolean>(null);
  const composer = useRef<HTMLDivElement>(null);
  const focusComposer = () => requestAnimationFrame(() => {
    composer.current?.scrollIntoView({ block: "nearest" });
    composer.current?.querySelector<HTMLElement>("textarea, a")?.focus();
  });
  const selectReply = (id: number) => { setReplyToId(id); focusComposer(); };
  const closeReply = () => {
    const url = new URL(window.location.href);
    url.searchParams.delete("replyTo");
    window.history.replaceState(window.history.state, "", url);
    setReplyToId(0);
  };
  const focused = useRef(false);
  useEffect(() => {
    if (focused.current || !isCommentAnchor(window.location.hash)) return;
    const anchor = window.location.hash.slice(1);
    const target = document.getElementById(anchor);
    if (!target) return;
    target.scrollIntoView({ block: "center" });
    focused.current = true;
  }, [feed.items]);
  const changed = async () => { setPartial(linkedCommentCursor() > 0); await Promise.all([feed.load(undefined, true), onChanged()]); };
  const created = async (id: number) => {
    await Promise.all([feed.appendThrough(id), onChanged()]);
    closeReply();
    requestAnimationFrame(() => document.getElementById(`comment-${id}`)?.scrollIntoView({ block: "nearest" }));
  };
  const target = feed.items.find(item => item.id === replyToId);
  return <><section className="community-comments" aria-labelledby="comments-heading">
    <h2 id="comments-heading" className="community-comments-head">댓글 {count}</h2>
    {partial && <EarlierComments disabled={feed.loading} load={() => {
      window.history.replaceState(window.history.state, "", window.location.pathname);
      setPartial(false);
      void feed.load();
    }} />}
    {!feed.loading && !feed.error && !feed.items.length && <p className="community-comments-empty">첫 댓글을 남겨 주세요.</p>}
    <CommentList items={feed.items} postId={postId} notify={notify} sending={sending} onChanged={changed} onReply={selectReply} />
    <CommunityError message={feed.error} retry={() => void feed.load(feed.cursor ?? undefined)} />
    {feed.loading && <p className="community-status" role="status">댓글을 불러오고 있어요.</p>}
    {!feed.loading && feed.cursor !== null && <button type="button" className="community-more" onClick={() => void feed.load(feed.cursor!)}>댓글 더 보기</button>}
  </section><div ref={composer} className="community-comment-dock">
    {replyToId > 0 && <div className="community-reply-target"><strong>{target?.author} 댓글에 대댓글</strong>
      <button type="button" disabled={sending} onClick={() => { if (discardDraft.current?.() !== false) closeReply(); }}>취소</button></div>}
    <MemberParticipation postId={postId} returnTo={composerReturnTo(postId, replyToId)}>
      {participation => <CommentComposer key={replyToId} discardDraft={discardDraft} postId={postId} replyToId={replyToId}
        participation={participation} onSending={setSending} onSaved={created} />}</MemberParticipation></div></>;
}

type ListProps = Pick<ItemProps, "postId" | "notify" | "onChanged" | "sending"> & {
  readonly items: readonly CommunityEntry[];
  readonly onReply: (id: number) => void;
};

function CommentList({ items, postId, notify, sending, onChanged, onReply }: ListProps) {
  return <ol>{commentThreads(items).map(thread => <li key={thread.id} className="community-comment-thread">
      {thread.root && <CommentItem key={thread.root.updatedAt} comment={thread.root} postId={postId}
        notify={notify} onChanged={onChanged} sending={sending} onReply={() => onReply(thread.id)} />}
      {!thread.root && <p className="community-parent-missing">원댓글을 볼 수 없어요.</p>}
      {thread.replies.length > 0 && <ol className="community-replies" aria-label="대댓글">
        {thread.replies.map(reply => <li key={reply.id}><CommentItem key={reply.updatedAt} comment={reply}
          postId={postId} notify={notify} onChanged={onChanged} /></li>)}</ol>}
    </li>)}</ol>;
}

function EarlierComments({ disabled, load }: { readonly disabled: boolean; readonly load: () => void }) {
  return <button type="button" className="community-earlier" disabled={disabled} onClick={load} aria-label="이전 댓글 보기">
    <span className="community-earlier-dots" aria-hidden="true">···</span><span aria-hidden="true">이전 댓글</span></button>;
}

function composerReturnTo(postId: number, replyToId: number) {
  if (replyToId) return `/community/${postId}?replyTo=${replyToId}`;
  return communityReturnTo(postId);
}

type ComposerProps = { readonly discardDraft: Ref<() => boolean>; readonly onSending: (busy: boolean) => void; readonly replyToId: number; readonly postId: number; readonly onSaved: (id: number) => Promise<void> };

function CommentComposer({ postId, replyToId, onSaved, participation, onSending, discardDraft }: ComposerProps & { readonly participation: CommunityParticipation }) {
  const active = useCurrentCommunityForm();
  let scope = `comment:${postId}`;
  let label = "댓글";
  if (replyToId) {
    scope += `:reply:${replyToId}`;
    label = "대댓글";
  }
  const savedDraft = useMemberDraft(scope, participation.memberId!);
  const { body, authorMode, requestId } = savedDraft.draft;
  useImperativeHandle(discardDraft, () => () => {
    if (body && !window.confirm("작성 중인 대댓글을 지울까요?")) return false;
    savedDraft.clear();
    return true;
  });
  const [focused, setFocused] = useState(false);
  const action = useCommunityAction();
  useDraftGuard(body !== "");
  const expanded = focused || body !== "";
  async function publish() {
    if (authorMode === "PROFILE" && !participation.profile?.path) return;
    const input = normalizeComment(body);
    const result = await createComment(postId, input.body, requestId, authorMode, participation.memberId!, replyToId || undefined);
    if (!active.current) return;
    savedDraft.change({ body: "", authorMode: "ANONYMOUS" });
    savedDraft.clear();
    setFocused(false);
    trackCommentCreated();
    await onSaved(result.id);
  }
  const send = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void action.run(async () => {
      onSending(true);
      try { await publish(); } finally { onSending(false); }
    });
  };
  return <form className="community-comment-composer" onSubmit={send}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <fieldset disabled={action.busy}><label htmlFor="comment-body-new" className="community-sr-only">{label}</label>
      <textarea id="comment-body-new" name="body" onFocus={() => setFocused(true)} autoFocus={replyToId > 0 || queryCommentId("reply") === 1} required maxLength={COMMENT_LIMIT} rows={composerRows(expanded)} value={body}
        onChange={event => savedDraft.change({ body: event.target.value })} onKeyDown={submitOnEnter} placeholder={`${label}을 입력하세요`} />
      <div className="community-comment-tools">
        <AuthorChoice participation={participation} mode={authorMode} onChange={mode => savedDraft.change({ authorMode: mode })} />
        <button className="community-send" disabled={!body.trim() || (authorMode === "PROFILE" && !participation.profile?.path)} aria-label={`${label} 등록`}>등록</button>
      </div></fieldset>
    <CommunityError message={action.error || savedDraft.storageError} />
    {action.needsLogin && <CommunityLogin returnTo={composerReturnTo(postId, replyToId)} />}
    {expanded && <p className="community-count">{body.length.toLocaleString()} / 1,000자</p>}</form>;
}

type EditProps = { readonly postId: number; readonly comment: CommunityEntry; readonly onSaved: () => Promise<void>; readonly onCancel: () => void };

function CommentEditForm(props: EditProps) {
  if (!props.comment.memberOwned) return <CommentEditFields {...props} />;
  return <MemberParticipation postId={props.postId} returnTo={communityCommentEditReturnTo(props.postId, props.comment.id)}>
    {participation => <MemberCommentEdit {...props} participation={participation} />}</MemberParticipation>;
}

function MemberCommentEdit(props: EditProps & { readonly participation: CommunityParticipation }) {
  const draft = useMemberDraft(`comment:edit:${props.comment.id}`, props.participation.memberId!,
    { title: "", body: props.comment.body });
  return <CommentEditFields {...props} memberDraft={draft} />;
}

function CommentEditFields({ postId, comment, onSaved, onCancel, memberDraft }: EditProps & { readonly memberDraft?: ReturnType<typeof useMemberDraft> }) {
  const [edited, setEdited] = useState(comment.body ?? "");
  const active = useCurrentCommunityForm();
  const body = memberDraft?.draft.body ?? edited;
  const change = (value: string) => { if (memberDraft) return memberDraft.change({ body: value }); setEdited(value); };
  const action = useCommunityAction();
  useDraftGuard(body !== comment.body);
  const save = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void action.run(async () => {
      await editComment(postId, comment.id, normalizeComment(body).body);
      if (!active.current) return;
      memberDraft?.clear();
      finishCommunityEdit();
      await onSaved();
    });
  };
  const cancel = () => {
    if (body !== comment.body && !window.confirm("수정을 취소할까요?")) return;
    memberDraft?.clear(); finishCommunityEdit(); onCancel();
  };
  return <form className="community-comment-edit" onSubmit={save}><fieldset disabled={action.busy}>
    <label htmlFor={`comment-body-${comment.id}`} className="community-sr-only">댓글 수정</label>
    <textarea id={`comment-body-${comment.id}`} name="body" autoFocus required maxLength={COMMENT_LIMIT} rows={3} value={body} onChange={event => change(event.target.value)} onKeyDown={submitOnEnter} /></fieldset>
    <CommunityError message={action.error || memberDraft?.storageError || ""} />
    {action.needsLogin && <CommunityLogin returnTo={communityCommentEditReturnTo(postId, comment.id)} />}
    <div className="community-edit-buttons"><button type="button" disabled={action.busy} onClick={cancel}>취소</button>
      <button className="community-primary-button" disabled={action.busy}>{action.busy && "저장 중…"}{!action.busy && "저장"}</button></div></form>;
}

function composerRows(expanded: boolean) {
  if (expanded) return 3;
  return 1;
}

type ItemProps = { readonly sending?: boolean; readonly onReply?: () => void; readonly comment: CommunityEntry; readonly postId: number; readonly notify: Notify; readonly onChanged: () => Promise<void> };

function CommentItem({ comment, postId, notify, onChanged, onReply, sending }: ItemProps) {
  const [editing, setEditing] = useState(() => comment.editable && editedCommentId() === comment.id);
  const remove = async () => { await deleteComment(postId, comment.id); await onChanged(); };
  return <article id={`comment-${comment.id}`} className="community-comment"><CommunityPhoto photoUrl={comment.authorPhotoUrl} small />
    <div className="community-entry-main"><div className="community-entry-head"><CommunityByline author={comment.author} createdAt={comment.createdAt} updatedAt={comment.updatedAt} markWriter={comment.postAuthor} authorPath={comment.authorPath} />
      {!editing && <div className="community-comment-actions">
        {onReply && <button type="button" className="community-write-reply" disabled={sending} onClick={onReply}>대댓글</button>}
        <EntryMenu entry={comment} label={`${comment.author} 댓글 메뉴`} notify={notify} onEdit={() => setEditing(true)} onDelete={remove} deleteQuestion="댓글을 삭제할까요?" />
      </div>}</div>
      {editing && <CommentEditForm postId={postId} comment={comment} onCancel={() => setEditing(false)} onSaved={async () => { setEditing(false); await onChanged(); }} />}
      {!editing && <PlainText text={comment.body ?? ""} />}
    </div></article>;
}

function linkedCommentCursor() {
  const edited = editedCommentId();
  if (edited > 0) return edited - 1;
  const replyTo = queryCommentId("replyTo");
  if (replyTo) return replyTo - 1;
  if (typeof window === "undefined") return 0;
  const match = /^#comment-(\d+)$/.exec(window.location.hash);
  if (!match) return 0;
  const id = Number(match[1]);
  if (!Number.isSafeInteger(id) || id < 1) return 0;
  return id - 1;
}

function editedCommentId() {
  return queryCommentId("editComment");
}

function queryCommentId(name: string) {
  if (typeof window === "undefined") return 0;
  const id = Number(new URLSearchParams(window.location.search).get(name));
  if (!Number.isSafeInteger(id) || id < 1) return 0;
  return id;
}

function submitOnEnter(event: KeyboardEvent<HTMLTextAreaElement>) {
  if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return;
  event.preventDefault();
  event.currentTarget.form?.requestSubmit();
}

function isCommentAnchor(hash: string) {
  return hash === "#comments-heading" || /^#comment-\d+$/.test(hash);
}

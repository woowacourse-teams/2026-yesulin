"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { PiArrowUp } from "react-icons/pi";
import { createComment, deleteComment, editComment, getComments } from "@/features/community/api";
import { trackCommentCreated } from "@/features/community/analytics";
import { normalizeComment } from "@/features/community/draft";
import { useCommunityAction, useCommunityFeed, useCurrentCommunityForm, useDraftGuard } from "@/features/community/hooks";
import { communityCommentEditReturnTo, communityReturnTo, finishCommunityEdit } from "@/features/community/navigation";
import { useMemberDraft } from "@/features/community/use-member-draft";
import type { CommunityEntry, CommunityParticipation } from "@/features/community/types";
import { AnonymousAvatar, CommunityByline, CommunityError, PlainText } from "./community-ui";
import { AuthorChoice, CommunityLogin, MemberParticipation } from "./member-participation";
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
    const reply = new URLSearchParams(window.location.search).get("reply") === "1";
    if (focused.current || (!reply && !isCommentAnchor(window.location.hash))) return;
    let anchor = window.location.hash.slice(1);
    if (reply) anchor = "comments-heading";
    const target = document.getElementById(anchor);
    if (!target) return;
    target.scrollIntoView({ block: "center" });
    focused.current = true;
  }, [feed.items]);
  const changed = async () => { setPartial(linkedCommentCursor() > 0); await Promise.all([feed.load(undefined, true), onChanged()]); };
  const created = async (id: number) => {
    await Promise.all([feed.appendThrough(id), onChanged()]);
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
  </section><MemberParticipation postId={postId}>{participation => <CommentComposer postId={postId} participation={participation} onSaved={created} />}</MemberParticipation></>;
}

function EarlierComments({ disabled, load }: { readonly disabled: boolean; readonly load: () => void }) {
  return <button type="button" className="community-earlier" disabled={disabled} onClick={load} aria-label="이전 댓글 보기">
    <span className="community-earlier-dots" aria-hidden="true">···</span><span aria-hidden="true">이전 댓글</span></button>;
}

type ComposerProps = { readonly postId: number; readonly onSaved: (id: number) => Promise<void> };

function CommentComposer({ postId, onSaved, participation }: ComposerProps & { readonly participation: CommunityParticipation }) {
  const active = useCurrentCommunityForm();
  const savedDraft = useMemberDraft(`comment:${postId}`, participation.memberId!, participation.fixedMode);
  const { body, authorMode, requestId } = savedDraft.draft;
  const [focused, setFocused] = useState(false);
  const action = useCommunityAction();
  useDraftGuard(body !== "");
  const expanded = focused || body !== "";
  const send = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void action.run(async () => {
      const input = normalizeComment(body);
      const result = await createComment(postId, input.body, requestId, authorMode, participation.memberId!);
      if (!active.current) return;
      savedDraft.clear(); savedDraft.change({ body: "" }); setFocused(false);
      trackCommentCreated();
      window.dispatchEvent(new Event("community:participation-changed"));
      await onSaved(result.id);
    });
  };
  return <form className="community-comment-composer" data-expanded={expanded} onSubmit={send}
    onFocus={() => setFocused(true)} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
    <AuthorChoice participation={participation} mode={authorMode} onChange={mode => savedDraft.change({ authorMode: mode })} />
    <fieldset disabled={action.busy}><label htmlFor="comment-body-new" className="community-sr-only">댓글</label>
      <textarea id="comment-body-new" name="body" required maxLength={COMMENT_LIMIT} rows={composerRows(expanded)} value={body}
        onChange={event => savedDraft.change({ body: event.target.value })} onKeyDown={submitOnEnter} placeholder="댓글 남기기" />
      <button className="community-send" aria-label="댓글 올리기"><PiArrowUp size={18} aria-hidden="true" /></button></fieldset>
    <CommunityError message={action.error || savedDraft.storageError} />
    {action.needsLogin && <CommunityLogin returnTo={communityReturnTo(postId)} />}
    {expanded && <p className="community-count">{body.length.toLocaleString()} / 1,000자</p>}</form>;
}

type EditProps = { readonly postId: number; readonly comment: CommunityEntry; readonly onSaved: () => Promise<void>; readonly onCancel: () => void };

function CommentEditForm(props: EditProps) {
  if (!props.comment.memberOwned) return <CommentEditFields {...props} />;
  return <MemberParticipation postId={props.postId} returnTo={communityCommentEditReturnTo(props.postId, props.comment.id)}>
    {participation => <MemberCommentEdit {...props} participation={participation} />}</MemberParticipation>;
}

function MemberCommentEdit(props: EditProps & { readonly participation: CommunityParticipation }) {
  const draft = useMemberDraft(`comment:edit:${props.comment.id}`, props.participation.memberId!, props.participation.fixedMode,
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

type ItemProps = { readonly comment: CommunityEntry; readonly postId: number; readonly notify: Notify; readonly onChanged: () => Promise<void> };

function CommentItem({ comment, postId, notify, onChanged }: ItemProps) {
  const [editing, setEditing] = useState(() => comment.editable && editedCommentId() === comment.id);
  const remove = async () => { await deleteComment(postId, comment.id); await onChanged(); };
  return <li id={`comment-${comment.id}`} className="community-comment"><AnonymousAvatar author={comment.author} photoUrl={comment.authorPhotoUrl} small />
    <div className="community-entry-main"><div className="community-entry-head"><CommunityByline author={comment.author} createdAt={comment.createdAt} updatedAt={comment.updatedAt} markWriter={comment.postAuthor} authorPath={comment.authorPath} />
      {!editing && <EntryMenu entry={comment} label={`${comment.author} 댓글 메뉴`} notify={notify} onEdit={() => setEditing(true)} onDelete={remove} deleteQuestion="댓글을 삭제할까요?" />}</div>
      {editing && <CommentEditForm postId={postId} comment={comment} onCancel={() => setEditing(false)} onSaved={async () => { setEditing(false); await onChanged(); }} />}
      {!editing && <PlainText text={comment.body ?? ""} />}</div></li>;
}

function linkedCommentCursor() {
  const edited = editedCommentId();
  if (edited > 0) return edited - 1;
  const match = /^#comment-(\d+)$/.exec(window.location.hash);
  if (!match) return 0;
  const id = Number(match[1]);
  if (!Number.isSafeInteger(id) || id < 1) return 0;
  return id - 1;
}

function editedCommentId() {
  if (typeof window === "undefined") return 0;
  const id = Number(new URLSearchParams(window.location.search).get("editComment"));
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

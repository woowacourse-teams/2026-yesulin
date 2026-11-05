"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createPost, editPost } from "@/features/community/api";
import { trackComposeStarted, trackPostCreated, useAbandonTracking, useTrackOnce } from "@/features/community/analytics";
import { normalizePost, SubmissionAttempt } from "@/features/community/draft";
import { useCommunityAction, useCurrentCommunityForm, useDraftGuard } from "@/features/community/hooks";
import { communityReturnTo, finishCommunityEdit } from "@/features/community/navigation";
import { useMemberDraft } from "@/features/community/use-member-draft";
import type { CommunityEntry, CommunityParticipation } from "@/features/community/types";
import { AuthorChoice, CommunityLogin, MemberParticipation } from "./member-participation";
import { AnonymousAvatar, CommunityError } from "./community-ui";

const TITLE_LIMIT = 100;
const BODY_LIMIT = 5000;
const NEAR_LIMIT = 0.9;

type Props = { readonly post?: CommunityEntry; readonly onSaved?: () => void; readonly onCancel?: () => void };
type Fields = { readonly title: string; readonly body: string };

export function PostEditor(props: Props) {
  if (props.post && !props.post.memberOwned) return <PostForm {...props} />;
  return <MemberParticipation postId={props.post?.id} returnTo={communityReturnTo(props.post?.id, Boolean(props.post))}>{participation => <MemberPostForm {...props} participation={participation} />}</MemberParticipation>;
}

function MemberPostForm(props: Props & { readonly participation: CommunityParticipation }) {
  let scope = "post:new";
  if (props.post) scope = `post:edit:${props.post.id}`;
  const initial = { title: props.post?.title ?? "", body: props.post?.body ?? "" };
  const draft = useMemberDraft(scope, props.participation.memberId!, props.participation.fixedMode, initial);
  return <PostForm {...props} memberDraft={draft} />;
}

type FormProps = Props & { readonly participation?: CommunityParticipation; readonly memberDraft?: ReturnType<typeof useMemberDraft> };
function PostForm({ post, onSaved, onCancel, participation, memberDraft }: FormProps) {
  const router = useRouter();
  const active = useCurrentCommunityForm();
  const action = useCommunityAction();
  const attempt = useRef(new SubmissionAttempt());
  const original = { title: post?.title ?? "", body: post?.body ?? "" };
  const [edited, setEdited] = useState<Fields>(original);
  const fields = memberDraft?.draft ?? edited;
  const setFields = (next: Fields) => { if (memberDraft) return memberDraft.change(next); setEdited(next); };
  const [saved, setSaved] = useState(false);
  const dirty = fields.title !== original.title || fields.body !== original.body;
  useDraftGuard(dirty && !saved);
  useTrackOnce(!post && Boolean(participation), trackComposeStarted);
  useAbandonTracking(!post, dirty && !saved);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await action.run(async () => {
      const input = normalizePost(fields.title, fields.body);
      const result = await savePost(post, input, memberDraft?.draft.requestId ?? attempt.current.idFor(input), participation, memberDraft?.draft.authorMode);
      if (!active.current) return;
      memberDraft?.clear();
      setSaved(true);
      if (!post) trackPostCreated();
      if (onSaved) { finishCommunityEdit(); return onSaved(); }
      router.replace(`/community/${result.id}`);
    });
  }
  function cancel() {
    if (dirty && !window.confirm("작성 중인 내용이 사라져요. 취소할까요?")) return;
    memberDraft?.clear();
    if (onCancel) { finishCommunityEdit(); return onCancel(); }
    router.push("/community");
  }
  const ready = fields.title.trim() !== "" && fields.body.trim() !== "";
  return <form className="community-compose" onSubmit={submit}>
    <ComposeBar editing={Boolean(post)} busy={action.busy} ready={ready} cancel={cancel} />
    {!post && participation && memberDraft && <AuthorChoice participation={participation} mode={memberDraft.draft.authorMode} onChange={authorMode => memberDraft.change({ authorMode })} />}
    <fieldset disabled={action.busy} className="community-compose-body"><AnonymousAvatar author={post?.author} />
      <ComposeFields fields={fields} author={post?.author ?? ""} onChange={setFields} /></fieldset>
    <CommunityError message={action.error || memberDraft?.storageError || ""} />
    {action.needsLogin && <CommunityLogin returnTo={communityReturnTo(post?.id, Boolean(post))} />}</form>;
}

type BarProps = { readonly editing: boolean; readonly busy: boolean; readonly ready: boolean; readonly cancel: () => void };

function ComposeBar({ editing, busy, ready, cancel }: BarProps) {
  return <div className="community-compose-bar"><button type="button" className="community-text-button" disabled={busy} onClick={cancel}>취소</button>
    <h1>{editing && "글 수정"}{!editing && "새 이야기"}</h1>
    <button className="community-primary-button" disabled={busy || !ready}>{submitLabel(editing, busy)}</button></div>;
}

function submitLabel(editing: boolean, busy: boolean) {
  if (busy) return "저장 중…";
  if (editing) return "저장";
  return "올리기";
}

function ComposeFields({ fields, onChange, author }: { readonly author: string; readonly fields: Fields; readonly onChange: (fields: Fields) => void }) {
  return <div className="community-compose-fields">{author && <strong>{author}</strong>}
    <label htmlFor="post-title" className="community-sr-only">제목 (최대 100자)</label>
    <input id="post-title" name="title" autoFocus required maxLength={TITLE_LIMIT} value={fields.title} placeholder="제목"
      onChange={event => onChange({ ...fields, title: event.target.value })} />
    <label htmlFor="post-body" className="community-sr-only">내용 (최대 5,000자)</label>
    <textarea id="post-body" name="body" required maxLength={BODY_LIMIT} rows={10} value={fields.body} placeholder="자유롭게 이야기를 적어 주세요."
      onChange={event => onChange({ ...fields, body: event.target.value })} />
    <p className="community-count" data-near={fields.body.length >= BODY_LIMIT * NEAR_LIMIT}>본문 {fields.body.length.toLocaleString()} / 5,000</p></div>;
}

function savePost(post: CommunityEntry | undefined, input: Fields, requestId: string,
  participation?: CommunityParticipation, authorMode: "ANONYMOUS" | "PROFILE" = "ANONYMOUS") {
  if (post) return editPost(post.id, input);
  return createPost({ ...input, authorMode, expectedMemberId: participation!.memberId! }, requestId);
}

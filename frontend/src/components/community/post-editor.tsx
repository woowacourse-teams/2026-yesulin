"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createPost, editPost } from "@/features/community/api";
import { trackComposeStarted, trackPostCreated, useAbandonTracking, useTrackOnce } from "@/features/community/analytics";
import { normalizePost, SubmissionAttempt } from "@/features/community/draft";
import { useCommunityAction, useDraftGuard } from "@/features/community/hooks";
import type { CommunityEntry } from "@/features/community/types";
import { AnonymousAvatar, CommunityError } from "./community-ui";

const TITLE_LIMIT = 100;
const BODY_LIMIT = 5000;
const NEAR_LIMIT = 0.9;

type Props = { readonly post?: CommunityEntry; readonly onSaved?: () => void; readonly onCancel?: () => void };
type Fields = { readonly title: string; readonly body: string };

export function PostEditor({ post, onSaved, onCancel }: Props) {
  const router = useRouter();
  const action = useCommunityAction();
  const attempt = useRef(new SubmissionAttempt());
  const original = { title: post?.title ?? "", body: post?.body ?? "" };
  const [fields, setFields] = useState<Fields>(original);
  const [saved, setSaved] = useState(false);
  const dirty = fields.title !== original.title || fields.body !== original.body;
  useDraftGuard(dirty && !saved);
  useTrackOnce(!post, trackComposeStarted);
  useAbandonTracking(!post, dirty && !saved);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await action.run(async () => {
      const input = normalizePost(fields.title, fields.body);
      const result = await savePost(post, input, attempt.current.idFor(input));
      setSaved(true);
      if (!post) trackPostCreated();
      if (onSaved) return onSaved();
      router.replace(`/community/${result.id}`);
    });
  }
  function cancel() {
    if (dirty && !window.confirm("작성 중인 내용이 사라져요. 취소할까요?")) return;
    if (onCancel) return onCancel();
    router.push("/community");
  }
  const ready = fields.title.trim() !== "" && fields.body.trim() !== "";
  return <form className="community-compose" onSubmit={submit}>
    <ComposeBar editing={Boolean(post)} busy={action.busy} ready={ready} cancel={cancel} />
    <fieldset disabled={action.busy} className="community-compose-body"><AnonymousAvatar author="익명1" />
      <ComposeFields fields={fields} onChange={setFields} /></fieldset>
    <CommunityError message={action.error} /></form>;
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

function ComposeFields({ fields, onChange }: { readonly fields: Fields; readonly onChange: (fields: Fields) => void }) {
  return <div className="community-compose-fields"><strong>익명1</strong>
    <label htmlFor="post-title" className="community-sr-only">제목 (최대 100자)</label>
    <input id="post-title" name="title" autoFocus required maxLength={TITLE_LIMIT} value={fields.title} placeholder="제목"
      onChange={event => onChange({ ...fields, title: event.target.value })} />
    <label htmlFor="post-body" className="community-sr-only">내용 (최대 5,000자)</label>
    <textarea id="post-body" name="body" required maxLength={BODY_LIMIT} rows={10} value={fields.body} placeholder="자유롭게 이야기를 적어 주세요."
      onChange={event => onChange({ ...fields, body: event.target.value })} />
    <p className="community-count" data-near={fields.body.length >= BODY_LIMIT * NEAR_LIMIT}>본문 {fields.body.length.toLocaleString()} / 5,000</p></div>;
}

function savePost(post: CommunityEntry | undefined, input: { title: string; body: string }, requestId: string) {
  if (post) return editPost(post.id, input);
  return createPost(input, requestId);
}

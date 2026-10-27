"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createPost, editPost } from "@/features/community/api";
import { normalizePost, SubmissionAttempt } from "@/features/community/draft";
import { useCommunityAction, useDraftGuard } from "@/features/community/hooks";
import type { CommunityEntry } from "@/features/community/types";
import { AnonymousAvatar, BrowserOwnershipNotice, CommunityError } from "./community-ui";

type Props = { readonly post?: CommunityEntry; readonly onSaved?: () => void; readonly onCancel?: () => void };

export function PostEditor({ post, onSaved, onCancel }: Props) {
  const router = useRouter();
  const action = useCommunityAction();
  const attempt = useRef(new SubmissionAttempt());
  const [dirty, setDirty] = useState(false);
  useDraftGuard(dirty);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    await action.run(async () => {
      const input = normalizePost(String(fields.get("title") ?? ""), String(fields.get("body") ?? ""));
      const result = await savePost(post, input, attempt.current.idFor(input));
      setDirty(false);
      if (onSaved) return onSaved();
      router.replace(`/community/${result.id}`);
    });
  }
  function cancel() {
    if (dirty && !window.confirm("작성 중인 내용이 사라져요. 취소할까요?")) return;
    if (onCancel) return onCancel();
    router.push("/community");
  }
  return <form className="community-editor" onSubmit={submit} onChange={() => setDirty(true)}>
    <h1>{post && "글 수정"}{!post && "새로운 이야기"}</h1><div className="community-author"><AnonymousAvatar /><strong>익명</strong></div><BrowserOwnershipNotice />
    <fieldset disabled={action.busy}><label htmlFor="post-title">제목 <span>최대 100자</span></label>
      <input id="post-title" name="title" required maxLength={100} defaultValue={post?.title ?? ""} placeholder="어떤 이야기를 나눌까요?" />
      <label htmlFor="post-body">내용 <span>최대 5,000자</span></label>
      <textarea id="post-body" name="body" required maxLength={5000} rows={12} defaultValue={post?.body ?? ""} placeholder="자유롭게 이야기를 적어 주세요." />
    </fieldset><CommunityError message={action.error} /><div className="community-actions">
      <button type="button" className="community-button" disabled={action.busy} onClick={cancel}>취소</button>
      <button className="community-button community-primary" disabled={action.busy}>{action.busy && "저장 중…"}{!action.busy && "저장"}</button>
    </div></form>;
}

function savePost(post: CommunityEntry | undefined, input: { title: string; body: string }, requestId: string) {
  if (post) return editPost(post.id, input);
  return createPost(input, requestId);
}

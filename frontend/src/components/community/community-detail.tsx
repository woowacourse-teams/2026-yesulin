"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PiPaperPlaneTilt, PiPencilSimple, PiTrash } from "react-icons/pi";
import { AuditionRequestError } from "@/features/auditions/api-client";
import { deletePost, getPost } from "@/features/community/api";
import { errorMessage, useCommunityAction } from "@/features/community/hooks";
import type { CommunityEntry } from "@/features/community/types";
import { CommunityAuthor, CommunityError, CommunityMissing, PlainText } from "./community-ui";
import { PostEditor } from "./post-editor";
import { CommunityComments } from "./community-comments";
import { ReportForm } from "./report-form";

export function CommunityDetail({ id }: { readonly id: number }) {
  const [post, setPost] = useState<CommunityEntry | null>(null);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState(false);
  const [editing, setEditing] = useState(false);
  const reload = useCallback(async () => {
    try { setPost(await getPost(id)); setError(""); }
    catch (cause) {
      if (cause instanceof AuditionRequestError && cause.status === 404) return setMissing(true);
      setError(errorMessage(cause));
    }
  }, [id]);
  useEffect(() => {
    let active = true;
    getPost(id).then(result => { if (active) setPost(result); }).catch(cause => {
      if (!active) return;
      if (cause instanceof AuditionRequestError && cause.status === 404) return setMissing(true);
      setError(errorMessage(cause));
    });
    return () => { active = false; };
  }, [id]);
  if (missing) return <CommunityMissing />;
  if (editing && post) return <PostEditor post={post} onCancel={() => setEditing(false)} onSaved={() => { setEditing(false); void reload(); }} />;
  return <>
    <CommunityError message={error} retry={() => void reload()} />
    {!post && !error && <p role="status">글을 불러오고 있어요.</p>}
    {post && <><article className="community-post"><CommunityAuthor createdAt={post.createdAt} updatedAt={post.updatedAt} /><h1>{post.title}</h1>
      <PlainText text={post.body ?? ""} />
      <PostActions post={post} edit={() => setEditing(true)} /><ReportForm entryId={post.id} />
    </article><CommunityComments postId={id} count={post.commentCount} onChanged={reload} /></>}</>;
}

function PostActions({ post, edit }: { readonly post: CommunityEntry; readonly edit: () => void }) {
  const router = useRouter();
  const action = useCommunityAction();
  const [copied, setCopied] = useState(false);
  async function remove() {
    if (!window.confirm("글을 삭제할까요? 댓글도 함께 보이지 않게 돼요.")) return;
    await action.run(async () => { await deletePost(post.id); router.replace("/community"); });
  }
  async function share() {
    await action.run(async () => { await navigator.clipboard.writeText(window.location.href); setCopied(true); });
  }
  return <><div className="community-actions"><button className="community-button" onClick={share} disabled={action.busy}><PiPaperPlaneTilt size={19} aria-hidden="true" />링크 복사</button>
    {post.editable && <><button className="community-button" onClick={edit} disabled={action.busy}><PiPencilSimple size={18} aria-hidden="true" />수정</button>
      <button className="community-button" onClick={remove} disabled={action.busy}><PiTrash size={18} aria-hidden="true" />삭제</button></>}
    {copied && <span role="status">링크를 복사했어요.</span>}</div><CommunityError message={action.error} /></>;
}

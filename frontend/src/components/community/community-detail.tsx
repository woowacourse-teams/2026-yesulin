"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PiArrowLeft, PiChatCircle, PiLink } from "react-icons/pi";
import { AuditionRequestError } from "@/features/auditions/api-client";
import { deletePost, getPost } from "@/features/community/api";
import { trackPostViewed, useTrackOnce } from "@/features/community/analytics";
import { errorMessage } from "@/features/community/hooks";
import { copyLink, postUrl } from "@/features/community/share";
import type { CommunityEntry, CommunityLikeState } from "@/features/community/types";
import { CommunitySubbar } from "./community-shell";
import { AnonymousAvatar, CommunityByline, CommunityError, CommunityMissing, CommunityToast, PlainText, useCommunityToast } from "./community-ui";
import { CommunityComments } from "./community-comments";
import { EntryMenu } from "./entry-menu";
import { FeedSkeleton } from "./community-list";
import { LikeButton } from "./like-button";
import { PostEditor } from "./post-editor";

type Notify = (message: string) => void;

export function CommunityDetail({ id }: { readonly id: number }) {
  const [post, setPost] = useState<CommunityEntry | null>(null);
  const [error, setError] = useState("");
  const [missing, setMissing] = useState(false);
  const [editing, setEditing] = useState(false);
  const toast = useCommunityToast();
  useTrackOnce(post !== null, trackPostViewed);
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
  const liked = (state: CommunityLikeState) => setPost(current => {
    if (!current) return current;
    return { ...current, ...state };
  });
  return <><DetailSubbar post={post} notify={toast.show} edit={() => setEditing(true)} />
    <CommunityError message={error} retry={() => void reload()} />
    {!post && !error && <FeedSkeleton />}
    {post && <div className="community-thread"><PostArticle post={post} notify={toast.show} onLiked={liked} />
      <CommunityComments postId={id} count={post.commentCount} notify={toast.show} onChanged={reload} /></div>}
    <CommunityToast message={toast.message} /></>;
}

type SubbarProps = { readonly post: CommunityEntry | null; readonly notify: Notify; readonly edit: () => void };

function DetailSubbar({ post, notify, edit }: SubbarProps) {
  const router = useRouter();
  const remove = async () => { await deletePost(post!.id); router.replace("/community"); };
  return <CommunitySubbar><Link className="community-back" href="/community"><PiArrowLeft size={18} aria-hidden="true" />익명게시판</Link>
    {post && <EntryMenu entry={post} label="글 메뉴" notify={notify} shareUrl={() => postUrl(post.id)} onEdit={edit} onDelete={remove}
      deleteQuestion="글을 삭제할까요? 댓글도 함께 보이지 않게 돼요." />}</CommunitySubbar>;
}

type ArticleProps = { readonly post: CommunityEntry; readonly notify: Notify; readonly onLiked: (state: CommunityLikeState) => void };

function PostArticle({ post, notify, onLiked }: ArticleProps) {
  return <article className="community-post"><div className="community-post-author"><AnonymousAvatar author={post.author} />
    <CommunityByline author={post.author} createdAt={post.createdAt} updatedAt={post.updatedAt} /></div>
    <h1>{post.title}</h1><PlainText text={post.body ?? ""} />
    <div className="community-reactions community-post-reactions"><LikeButton post={post} onChanged={onLiked} labelled />
      <a href="#comments-heading"><PiChatCircle size={19} aria-hidden="true" /><span>댓글 {post.commentCount}</span></a>
      <button type="button" onClick={() => void copyLink(postUrl(post.id), notify)}><PiLink size={19} aria-hidden="true" /><span>링크 복사</span></button></div></article>;
}

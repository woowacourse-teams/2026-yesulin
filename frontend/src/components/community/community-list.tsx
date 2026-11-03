"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PiArrowClockwise, PiChatCircle, PiLink, PiPlus } from "react-icons/pi";
import { communityListMemory, recentCommunityList } from "@/features/community/list-memory";
import { getPosts } from "@/features/community/api";
import { trackListViewed, useTrackOnce } from "@/features/community/analytics";
import { useCommunityFeed } from "@/features/community/hooks";
import { copyLink, postUrl } from "@/features/community/share";
import type { CommunityEntry, CommunityLikeState } from "@/features/community/types";
import { CommunitySubbar } from "./community-shell";
import { AnonymousAvatar, CommunityByline, CommunityError, CommunityToast, EntryRail, useCommunityToast } from "./community-ui";
import { EntryMenu } from "./entry-menu";
import { LikeButton } from "./like-button";

type Feed = ReturnType<typeof useCommunityFeed>;
type Notify = (message: string) => void;

export function CommunityList() {
  const [initial] = useState(recentCommunityList);
  const feed = useCommunityFeed(getPosts, initial);
  const toast = useCommunityToast();
  useTrackOnce(!feed.loading && !feed.error, trackListViewed);
  useEffect(() => { if (initial) window.scrollTo(0, communityListMemory.scroll); }, [initial]);
  useEffect(() => {
    if (feed.loading || feed.error) return;
    communityListMemory.page = { items: feed.items, nextCursor: feed.cursor };
    communityListMemory.savedAt = Date.now();
  }, [feed.items, feed.cursor, feed.loading, feed.error]);
  return <><ListSubbar feed={feed} /><FeedComposer /><FeedBody feed={feed} notify={toast.show} />
    <Link className="community-fab" href="/community/new" aria-label="새 글 쓰기"><PiPlus size={24} aria-hidden="true" /></Link>
    <CommunityToast message={toast.message} /></>;
}

function ListSubbar({ feed }: { readonly feed: Feed }) {
  return <CommunitySubbar><h1 className="community-subbar-title">익명게시판</h1><div className="community-subbar-actions">
    <button type="button" className="community-icon-button" disabled={feed.loading} onClick={() => void feed.load()} aria-label="새로고침"><PiArrowClockwise size={19} aria-hidden="true" /></button>
    <Link className="community-pill" href="/community/new"><PiPlus size={14} aria-hidden="true" />글쓰기</Link></div></CommunitySubbar>;
}

function FeedComposer() {
  return <Link className="community-composer" href="/community/new"><AnonymousAvatar /><span>지금 어떤 생각을 하고 있나요?</span></Link>;
}

function FeedBody({ feed, notify }: { readonly feed: Feed; readonly notify: Notify }) {
  if (feed.loading && feed.items.length === 0) return <FeedSkeleton />;
  return <><CommunityError message={feed.error} retry={() => void feed.load(feed.cursor ?? undefined)} />
    {!feed.loading && !feed.error && feed.items.length === 0 && <FeedEmpty />}
    <ul className="community-list" onClick={() => { communityListMemory.scroll = window.scrollY; }}>
      {feed.items.map(entry => <FeedPost key={entry.id} post={entry} notify={notify} onLiked={state => feed.update(entry.id, state)} />)}</ul>
    {feed.loading && <p className="community-status" role="status">이야기를 더 불러오고 있어요.</p>}
    {!feed.loading && feed.cursor !== null && <button type="button" className="community-more" onClick={() => void feed.load(feed.cursor!)}>이야기 더 보기</button>}</>;
}

export function FeedSkeleton() {
  return <div className="community-skeleton" role="status" aria-label="이야기를 불러오고 있어요.">
    {[0, 1, 2].map(index => <div key={index} className="community-skeleton-item" aria-hidden="true"><span /><div><i /><i /><i /></div></div>)}</div>;
}

function FeedEmpty() {
  return <div className="community-empty"><PiChatCircle size={36} aria-hidden="true" /><h2>첫 이야기를 기다리고 있어요</h2>
    <p>오늘 연습 이야기, 오디션 질문, 가벼운 인사도 좋아요.</p><Link href="/community/new" className="community-pill"><PiPlus size={14} aria-hidden="true" />첫 이야기 쓰기</Link></div>;
}

type PostProps = { readonly post: CommunityEntry; readonly notify: Notify; readonly onLiked: (state: CommunityLikeState) => void };

function FeedPost({ post, notify, onLiked }: PostProps) {
  const threaded = post.commentCount > 0;
  return <li className="community-entry"><article aria-labelledby={`post-title-${post.id}`}><EntryRail author={post.author} threaded={threaded} />
    <div className="community-entry-main"><div className="community-entry-head"><CommunityByline author={post.author} createdAt={post.createdAt} updatedAt={post.updatedAt} />
      <EntryMenu entry={post} label={`${post.title} 글 메뉴`} notify={notify} shareUrl={() => postUrl(post.id)} /></div>
      <Link href={`/community/${post.id}`} className="community-post-link"><h2 id={`post-title-${post.id}`}>{post.title}</h2><p className="community-preview">{post.body}</p></Link>
      <FeedActions post={post} notify={notify} onLiked={onLiked} />
      {threaded && <Link className="community-replies" href={`/community/${post.id}#comments-heading`}>댓글 {post.commentCount}개 보기</Link>}</div></article></li>;
}

function FeedActions({ post, notify, onLiked }: PostProps) {
  return <div className="community-reactions"><LikeButton post={post} onChanged={onLiked} />
    <Link href={`/community/${post.id}#comments-heading`} aria-label={`댓글 ${post.commentCount}개 보기`}><PiChatCircle size={19} aria-hidden="true" /><span>{post.commentCount}</span></Link>
    <button type="button" onClick={() => void copyLink(postUrl(post.id), notify)} aria-label="글 링크 복사"><PiLink size={19} aria-hidden="true" /></button></div>;
}

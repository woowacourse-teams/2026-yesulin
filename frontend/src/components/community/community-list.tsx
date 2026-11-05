"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { PiArrowClockwise, PiChatCircle, PiPencilSimple } from "react-icons/pi";
import { communityListMemory } from "@/features/community/list-memory";
import { getPosts } from "@/features/community/api";
import { trackListViewed, useTrackOnce } from "@/features/community/analytics";
import { useCommunityFeed } from "@/features/community/hooks";
import { postUrl } from "@/features/community/share";
import type { CommunityEntry, CommunityLikeState } from "@/features/community/types";
import { CommunityPhoto, CommunityByline, CommunityError, CommunityToast, useCommunityToast } from "./community-ui";
import { EntryMenu } from "./entry-menu";
import { LikeButton } from "./like-button";

type Feed = ReturnType<typeof useCommunityFeed>;
type Notify = (message: string) => void;

export function CommunityList() {
  const feed = useCommunityFeed(getPosts);
  const toast = useCommunityToast();
  useTrackOnce(!feed.loading && !feed.error, trackListViewed);
  useEffect(() => { window.scrollTo(0, communityListMemory.scroll); }, []);
  return <section className="community-lounge">
    <LoungeHeader />
    <div className="community-feed-panel"><FeedBody feed={feed} notify={toast.show} /></div>
    <button className="community-refresh" type="button" disabled={feed.loading} onClick={() => void feed.load()}>
      <PiArrowClockwise aria-hidden="true" />새로고침
    </button>
    <CommunityToast message={toast.message} />
  </section>;
}

function LoungeHeader() {
  return <header className="community-lounge-header">
    <h1 className="community-lounge-title">배우 <span>수다방</span></h1>
    <Link className="community-lounge-write" href="/community/new">
      <Image src="/images/community-star-chat.png" alt="" width={40} height={40} />
      글쓰기<PiPencilSimple size={15} aria-hidden="true" />
    </Link>
  </header>;
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
    <p>오늘 연습 이야기, 오디션 질문, 가벼운 인사도 좋아요.</p></div>;
}

type PostProps = { readonly post: CommunityEntry; readonly notify: Notify; readonly onLiked: (state: CommunityLikeState) => void };

function FeedPost({ post, notify, onLiked }: PostProps) {
  return <li className="community-entry"><article aria-labelledby={`post-title-${post.id}`}>
    <FeedByline post={post} notify={notify} />
    <Link href={`/community/${post.id}`} className="community-post-link">
      <h2 id={`post-title-${post.id}`}>{post.title}</h2>
      <p className="community-preview">{post.body}</p>
    </Link>
    <FeedActions post={post} onLiked={onLiked} />
  </article></li>;
}

function FeedByline({ post, notify }: Omit<PostProps, "onLiked">) {
  return <div className="community-feed-byline">
    <CommunityPhoto photoUrl={post.authorPhotoUrl} />
    <CommunityByline author={post.author} authorPath={post.authorPath} showProfileBadge createdAt={post.createdAt} updatedAt={post.updatedAt} />
    <EntryMenu entry={post} label={`${post.title} 글 메뉴`} notify={notify} shareUrl={() => postUrl(post.id)} />
  </div>;
}

function FeedActions({ post, onLiked }: Omit<PostProps, "notify">) {
  return <div className="community-reactions">
    <LikeButton post={post} onChanged={onLiked} />
    <Link href={`/community/${post.id}#comments-heading`} aria-label={`댓글 ${post.commentCount}개 보기`}>
      <PiChatCircle size={19} aria-hidden="true" /><span>{post.commentCount}</span>
    </Link>
  </div>;
}

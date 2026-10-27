"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PiArrowClockwise, PiChatCircle, PiPaperPlaneTilt } from "react-icons/pi";
import { communityListMemory, recentCommunityList } from "@/features/community/list-memory";
import { getPosts } from "@/features/community/api";
import { useCommunityAction, useCommunityFeed } from "@/features/community/hooks";
import type { CommunityEntry, CommunityLikeState } from "@/features/community/types";
import { AnonymousAvatar, CommunityAuthor, CommunityError } from "./community-ui";
import { LikeButton } from "./like-button";
import { ReportForm } from "./report-form";

export function CommunityList() {
  const [initial] = useState(recentCommunityList);
  const feed = useCommunityFeed(getPosts, initial);
  useEffect(() => { if (initial) window.scrollTo(0, communityListMemory.scroll); }, [initial]);
  useEffect(() => {
    if (feed.loading || feed.error) return;
    communityListMemory.page = { items: feed.items, nextCursor: feed.cursor };
    communityListMemory.savedAt = Date.now();
  }, [feed.items, feed.cursor, feed.loading, feed.error]);
  return <><h1 className="community-sr-only">커뮤니티</h1><FeedComposer />
    <div className="community-feed-label"><span>최신 이야기</span><button className="community-icon-button" disabled={feed.loading} onClick={() => void feed.load()} aria-label="새로고침"><PiArrowClockwise size={19} aria-hidden="true" /></button></div>
    {!feed.loading && !feed.error && feed.items.length === 0 && <FeedEmpty />}
    <ul className="community-list" onClick={() => { communityListMemory.scroll = window.scrollY; }}>{feed.items.map(entry => <FeedPost key={entry.id} post={entry} onLiked={state => feed.update(entry.id, state)} />)}</ul>
    <CommunityError message={feed.error} retry={() => void feed.load(feed.cursor ?? undefined)} />
    {feed.loading && <p className="community-status" role="status">이야기를 불러오고 있어요.</p>}
    {feed.cursor !== null && <button className="community-button community-more" disabled={feed.loading} onClick={() => void feed.load(feed.cursor!)}>이야기 더 보기</button>}</>;
}

function FeedComposer() {
  return <div className="community-feed-composer"><AnonymousAvatar /><Link className="community-composer-prompt" href="/community/new">지금 어떤 생각을 하고 있나요?</Link>
    <Link className="community-button community-post-button" href="/community/new">글 쓰기</Link></div>;
}

function FeedEmpty() {
  return <div className="community-empty"><PiChatCircle size={40} aria-hidden="true" /><h2>첫 이야기를 기다리고 있어요</h2>
    <p>가벼운 인사도 좋아요.<br />부담 없이 첫 글을 남겨 주세요.</p><Link href="/community/new" className="community-button">첫 이야기 쓰기</Link></div>;
}

type PostProps = { readonly post: CommunityEntry; readonly onLiked: (state: CommunityLikeState) => void };

function FeedPost({ post, onLiked }: PostProps) {
  return <li className="community-feed-post"><article><CommunityAuthor author={post.author} createdAt={post.createdAt} updatedAt={post.updatedAt} />
    <div className="community-card-options"><ReportForm entryId={post.id} compact /></div>
    <div className="community-feed-post-content"><Link href={`/community/${post.id}`} className="community-post-link" aria-label={post.title ?? "이야기 읽기"}>
      <h2>{post.title}</h2><p className="community-preview">{post.body}</p><span className="community-read-more">이야기 읽기</span></Link>
      <FeedActions post={post} onLiked={onLiked} /></div></article></li>;
}

function FeedActions({ post, onLiked }: PostProps) {
  const action = useCommunityAction();
  const [copied, setCopied] = useState(false);
  const share = () => action.run(async () => {
    await navigator.clipboard.writeText(`${window.location.origin}/community/${post.id}`);
    setCopied(true);
  });
  return <><div className="community-reactions"><LikeButton post={post} onChanged={onLiked} /><Link href={`/community/${post.id}#comments-heading`} aria-label={`댓글 ${post.commentCount}개 보기`}><PiChatCircle size={21} aria-hidden="true" /><span>{post.commentCount}</span></Link>
    <button onClick={share} disabled={action.busy} aria-label="글 링크 복사"><PiPaperPlaneTilt size={21} aria-hidden="true" /><span>공유</span></button>
    {copied && <span role="status" className="community-copy-status">복사했어요</span>}</div><CommunityError message={action.error} /></>;
}

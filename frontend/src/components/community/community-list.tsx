"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AuditionRequestError } from "@/features/auditions/api-client";
import { useAuthSession } from "@/components/auth/auth-session";
import { PiChatCircle, PiPencilSimple } from "react-icons/pi";
import { communityListMemory } from "@/features/community/list-memory";
import { getPosts } from "@/features/community/api";
import { trackListViewed, useTrackOnce } from "@/features/community/analytics";
import { useCommunityFeed } from "@/features/community/hooks";
import { postUrl } from "@/features/community/share";
import type { CommunityEntry, CommunityLikeState } from "@/features/community/types";
import { authorName } from "@/features/community/author-name";
import { CommunityPhoto, CommunityByline, CommunityError, CommunityToast, useCommunityToast } from "./community-ui";
import { CommunityInbox } from "./community-inbox";
import { EntryMenu } from "./entry-menu";
import { LikeButton } from "./like-button";

const moreLogin = "/login?returnTo=%2Fcommunity%3Fmore%3D1";

type Feed = ReturnType<typeof useCommunityFeed>;
type Notify = (message: string) => void;

export function CommunityList() {
  const { session, sessionReady } = useAuthSession();
  if (!sessionReady) return <FeedSkeleton />;
  return <CommunityFeed key={session?.credential ?? "guest"} signedIn={Boolean(session)} />;
}

function CommunityFeed({ signedIn }: { readonly signedIn: boolean }) {
  const router = useRouter();
  const loader = useCallback(async (before?: number) => {
    try { return await getPosts(before); }
    catch (cause) {
      if (before && cause instanceof AuditionRequestError && cause.status === 401) router.replace(moreLogin);
      throw cause;
    }
  }, [router]);
  const feed = useCommunityFeed(loader);
  const resumed = useRef(false);
  const { cursor, load } = feed;
  useEffect(() => {
    const url = new URL(window.location.href);
    if (!signedIn || !cursor || resumed.current || !url.searchParams.has("more")) return;
    resumed.current = true;
    url.searchParams.delete("more");
    window.history.replaceState(window.history.state, "", url);
    void load(cursor);
  }, [signedIn, cursor, load]);
  const toast = useCommunityToast();
  useTrackOnce(!feed.loading && !feed.error, trackListViewed);
  useEffect(() => { window.scrollTo(0, communityListMemory.scroll); }, []);
  return <section className="community-lounge">
    <LoungeHeader signedIn={signedIn} />
    <div className="community-feed-panel"><FeedBody feed={feed} signedIn={signedIn} notify={toast.show} /></div>
    <CommunityToast message={toast.message} />
  </section>;
}

function LoungeHeader({ signedIn }: { readonly signedIn: boolean }) {
  return <header className="community-lounge-header">
    <h1 className="community-lounge-title">배우 <span>수다방</span></h1>
    <div className="community-feed-tools">{signedIn && <CommunityInbox />}
    <Link className="community-lounge-write" href="/community/new">
      <Image src="/images/community-star-chat.png" alt="" width={40} height={40} />
      글쓰기<PiPencilSimple size={15} aria-hidden="true" />
    </Link></div>
  </header>;
}

function FeedBody({ feed, signedIn, notify }: { readonly feed: Feed; readonly signedIn: boolean; readonly notify: Notify }) {
  if (feed.loading && feed.items.length === 0) return <FeedSkeleton />;
  return <><CommunityError message={feed.error} retry={() => void feed.load(feed.cursor ?? undefined)} />
    {!feed.loading && !feed.error && feed.items.length === 0 && <FeedEmpty />}
    <ul className="community-list" onClick={() => { communityListMemory.scroll = window.scrollY; }}>
      {feed.items.map(entry => <FeedPost key={entry.id} post={entry} notify={notify} onLiked={state => feed.update(entry.id, state)} />)}</ul>
    {feed.loading && <p className="community-status" role="status">이야기를 더 불러오고 있어요.</p>}
    {!feed.loading && feed.cursor !== null && !signedIn && <Link className="community-more" href={moreLogin}>로그인하고 더 보기</Link>}
    {!feed.loading && feed.cursor !== null && signedIn && <button type="button" className="community-more" onClick={() => void feed.load(feed.cursor!)}>이야기 더 보기</button>}</>;
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
      <h2 id={`post-title-${post.id}`}>{post.likeCount >= 10 && <span className="community-popular">인기</span>}{post.title}</h2>
      <p className="community-preview">{post.body}</p>
    </Link>
    <FeedActions post={post} onLiked={onLiked} />
  </article></li>;
}

function FeedByline({ post, notify }: Omit<PostProps, "onLiked">) {
  return <div className="community-feed-byline">
    <CommunityPhoto photoUrl={post.authorPhotoUrl} />
    <CommunityByline author={authorName(post, post.id)} authorPath={post.authorPath} showProfileBadge createdAt={post.createdAt} updatedAt={post.updatedAt} />
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

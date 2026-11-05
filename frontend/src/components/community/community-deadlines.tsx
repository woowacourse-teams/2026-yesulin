"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAuditionPosts } from "@/features/audition-posts/api";
import { deadlineBadge } from "@/features/audition-posts/format";
import { auditionPostRoutes, type AuditionPostSummary } from "@/features/audition-posts/types";

const DEADLINE_LIMIT = 5;

/** 수다방 옆에서 마감이 가까운 공고로 이어 준다. 읽지 못하면 영역을 숨겨 피드를 방해하지 않는다. */
export function CommunityDeadlines() {
  const posts = useDeadlinePosts();
  if (!posts?.length) return null;
  return (
    <aside className="community-lounge-side" aria-labelledby="community-deadlines-title"><section className="community-side-card">
      <h2 id="community-deadlines-title">마감 임박 공고</h2>
      <ul className="community-deadlines">
        {posts.map((post) => <DeadlineItem key={post.id} post={post} />)}
      </ul>
      <Link href={auditionPostRoutes.list({ sort: "deadline" })} className="community-side-more">전체 공고 보기</Link>
    </section></aside>
  );
}

function DeadlineItem({ post }: { readonly post: AuditionPostSummary }) {
  const badge = deadlineBadge(post);
  return (
    <li>
      <Link href={auditionPostRoutes.detail(post.id)}>
        <span className="community-deadline-badge num" data-kind={badge.kind}>{badge.label}</span>
        <span className="community-deadline-title">{post.title}</span>
      </Link>
    </li>
  );
}

function useDeadlinePosts() {
  const [posts, setPosts] = useState<readonly AuditionPostSummary[] | null>(null);
  useEffect(() => {
    let active = true;
    getAuditionPosts({ page: 0, includeClosed: false, sort: "deadline" }, DEADLINE_LIMIT)
      .then((page) => { if (active) setPosts(page.posts); })
      .catch((cause: unknown) => console.error("[수다방 마감 공고 조회 실패]", cause));
    return () => { active = false; };
  }, []);
  return posts;
}

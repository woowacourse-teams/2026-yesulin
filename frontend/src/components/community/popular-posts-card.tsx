"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PiFlame } from "react-icons/pi";
import { getPopularPosts } from "@/features/community/api";
import type { PopularPost } from "@/features/community/types";

export function PopularPostsCard({ version }: { readonly version: number }) {
  const [posts, setPosts] = useState<readonly PopularPost[]>([]);
  useEffect(() => {
    const request = new AbortController();
    getPopularPosts(request.signal).then(items => {
      if (!request.signal.aborted) setPosts(items);
    }).catch(() => {
      if (!request.signal.aborted) setPosts([]);
    });
    return () => request.abort();
  }, [version]);
  if (!posts.length) return null;
  return <aside className="community-side-card community-ranked-posts" aria-labelledby="community-ranked-title">
    <h2 id="community-ranked-title"><PiFlame aria-hidden="true" />지금 인기 글</h2>
    <ol>{posts.map(post => <li key={post.id}><Link href={`/community/${post.id}`}>{post.title}</Link></li>)}</ol>
  </aside>;
}

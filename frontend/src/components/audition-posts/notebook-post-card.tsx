"use client";

import Link from "next/link";
import { PosterImage } from "@/components/ui/poster-image";
import { deadlineBadge, formatPostedDate } from "@/features/audition-posts/format";
import { posterHeadline } from "@/features/audition-posts/poster-headline";
import { auditionPostRoutes, type AuditionPostSummary } from "@/features/audition-posts/types";
import { publicViewCount } from "@/features/audition-posts/view-count";

const POSTER_SIZES = "(min-width: 1100px) 180px, (min-width: 761px) 25vw, 50vw";

/** 공개 목록의 포스터형 공고 카드. 마감 상태는 포스터 위 배지 글자로 보여 준다. */
export function NotebookPostCard({ post, today, now, rank }: { readonly post: AuditionPostSummary; readonly today: string; readonly now: number; readonly rank?: number }) {
  const badge = deadlineBadge(post, today);
  return <li className="min-w-0">
    <Link href={auditionPostRoutes.detail(post.id)} className="notebook-poster-card" data-ended={post.closed || undefined}>
      <div className="notebook-poster">
        <span className="notebook-poster-badge num" data-kind={badge.kind}>{badge.label}</span>
        <PostArtwork post={post} />
        {rank !== undefined && <span className="notebook-poster-rank num" aria-label={`${rank}위`}>{rank}</span>}
      </div>
      <h2 className="notebook-poster-title">{post.title}</h2>
      <PostByline post={post} />
      <PostMeta post={post} now={now} />
    </Link>
  </li>;
}

function PostArtwork({ post }: { readonly post: AuditionPostSummary }) {
  const fallback = <DefaultPoster post={post} />;
  if (!post.thumbnailUrl) return fallback;
  return <PosterImage key={post.thumbnailUrl} src={post.thumbnailUrl} alt="" sizes={POSTER_SIZES} fallback={fallback} />;
}

/** 이미지가 없는 공고는 분야 색 바탕에 작품명을 크게 쓴 포스터로 대신한다. */
function DefaultPoster({ post }: { readonly post: AuditionPostSummary }) {
  return <span className="notebook-poster-default" data-category={post.category || undefined} aria-hidden="true">
    <span className="notebook-poster-kind">{[post.category, "오디션"].filter(Boolean).join(" ")}</span>
    <span className="notebook-poster-headline">{posterHeadline(post.title)}</span>
    <span className="notebook-poster-mark">예술in</span>
  </span>;
}

function PostByline({ post }: { readonly post: AuditionPostSummary }) {
  const byline = [post.category, post.authorName].filter(Boolean).join(" · ");
  if (!byline) return null;
  return <p className="notebook-poster-byline">{byline}</p>;
}

function PostMeta({ post, now }: { readonly post: AuditionPostSummary; readonly now: number }) {
  const postedDate = formatPostedDate(post.postedAt);
  return <dl className="notebook-poster-meta">
    <div><dt>페이</dt><dd>{post.pay || "미기재"}</dd></div>
    {Boolean(postedDate) && <div><dt className="sr-only">게시일</dt><dd className="num">{postedDate}</dd></div>}
    <div><dt className="sr-only">조회수</dt><dd>조회 <span className="num" suppressHydrationWarning>{publicViewCount(post, now).toLocaleString("ko-KR")}</span></dd></div>
    {post.attachmentCount > 0 && <div><dt className="sr-only">첨부파일</dt><dd>첨부 <span className="num">{post.attachmentCount}</span></dd></div>}
  </dl>;
}

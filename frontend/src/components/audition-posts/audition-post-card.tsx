import Image from "next/image";
import Link from "next/link";
import { deadlineBadge, formatPostedDate } from "@/features/audition-posts/format";
import { auditionPostRoutes, type AuditionPostSummary } from "@/features/audition-posts/types";
import { DeadlineChip } from "./audition-post-badges";

const categoryArtwork: Readonly<Record<string, string>> = {
  연극: "/images/thumbnails/audition-theater.webp",
  뮤지컬: "/images/thumbnails/audition-musical.webp",
  퍼포먼스: "/images/thumbnails/audition-performance.webp",
  단원: "/images/thumbnails/audition-troupe.webp",
  기획사: "/images/thumbnails/audition-agency.webp",
};

export function AuditionPostCard({ post, today, notebook = false }: { readonly post: AuditionPostSummary; readonly today: string; readonly notebook?: boolean }) {
  const badge = deadlineBadge(post, today);
  const postedDate = formatPostedDate(post.postedAt);
  const defaultArtwork = categoryArtwork[post.category ?? ""] ?? "/images/thumbnails/audition-default.webp";

  return (
    <li className="min-w-0">
      <Link
        href={auditionPostRoutes.detail(post.id)}
        className={`group flex h-full min-h-36 gap-4 rounded-card border border-border bg-card p-4 transition-[border-color,box-shadow] hover:border-brand-line hover:shadow-[var(--shadow-1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand sm:p-5 ${post.closed ? "opacity-70" : ""} ${notebook ? "notebook-post-card" : ""}`}
      >
        {notebook ? post.thumbnailUrl ? <div className="notebook-post-image"><Image src={post.thumbnailUrl} alt="" fill unoptimized sizes="(min-width: 768px) 360px, 90vw" /></div> : <div className="notebook-post-image notebook-post-placeholder" data-category={post.category ?? undefined} aria-hidden="true"><Image src={defaultArtwork} alt="" fill sizes="(min-width: 1100px) 320px, (min-width: 761px) 45vw, 90vw" className="notebook-default-art" /><span className="notebook-default-copy"><Image src="/images/yesulin-logo-transparent.png" alt="" width={90} height={52} className="notebook-default-logo" /><span><span className="notebook-default-label">{post.category || "오디션"}</span><span className="notebook-default-caption">오디션 공고</span></span></span></div> : null}
        <div className="flex min-w-0 flex-1 flex-col">
          <p className="flex min-w-0 items-center gap-2 text-xs">
            {post.category ? <span className="shrink-0 font-semibold text-brand">{post.category}</span> : null}
            <DeadlineChip badge={badge} />
          </p>
          <h2 className="mt-2 line-clamp-2 text-[17px] font-bold leading-6 group-hover:text-brand">{post.title}</h2>
          {post.authorName ? <p className="mt-1.5 truncate text-sm text-muted-strong">{post.authorName}</p> : null}
          <dl className="mt-auto flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 border-t border-border-soft pt-2.5 text-xs text-muted-strong">
            <div className="flex min-w-0 max-w-full gap-1">
              <dt className="shrink-0 text-muted">페이</dt>
              <dd className="truncate">{post.pay || "미기재"}</dd>
            </div>
            {postedDate ? (
              <div className="flex gap-1">
                <dt className="sr-only">게시일</dt>
                <dd className="num text-muted">{postedDate}</dd>
              </div>
            ) : null}
            <div className="flex gap-1">
              <dt className="sr-only">조회수</dt>
              <dd className="text-muted">조회 <span className="num">{post.viewCount.toLocaleString("ko-KR")}</span></dd>
            </div>
            {post.attachmentCount > 0 ? (
              <div className="flex gap-1">
                <dt className="sr-only">첨부파일</dt>
                <dd className="text-muted">첨부 <span className="num">{post.attachmentCount}</span></dd>
              </div>
            ) : null}
          </dl>
        </div>
        {!notebook && post.thumbnailUrl ? (
          <div className="relative hidden h-24 w-20 shrink-0 overflow-hidden rounded-control bg-border-soft min-[400px]:block">
            <Image
              src={post.thumbnailUrl}
              alt=""
              fill
              unoptimized
              sizes="80px"
              className="object-cover"
            />
          </div>
        ) : null}
      </Link>
    </li>
  );
}

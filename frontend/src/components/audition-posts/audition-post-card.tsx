import Image from "next/image";
import Link from "next/link";
import { deadlineBadge, formatPostedDate } from "@/features/audition-posts/format";
import { auditionPostRoutes, type AuditionPostSummary } from "@/features/audition-posts/types";
import { DeadlineChip } from "./audition-post-badges";

export function AuditionPostCard({ post, today }: { readonly post: AuditionPostSummary; readonly today: string }) {
  const badge = deadlineBadge(post, today);
  const postedDate = formatPostedDate(post.postedAt);

  return (
    <li className="min-w-0">
      <Link
        href={auditionPostRoutes.detail(post.id)}
        className={`group flex h-full min-h-36 gap-4 rounded-card border border-border bg-card p-4 transition-[border-color,box-shadow] hover:border-brand-line hover:shadow-[var(--shadow-1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand sm:p-5 ${post.closed ? "opacity-70" : ""}`}
      >
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
        {post.thumbnailUrl ? (
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

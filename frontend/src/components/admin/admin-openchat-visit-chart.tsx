import { adminAuditionPostRoutes } from "@/features/admin/audition-posts";
import type { AdminOpenChatVisits } from "@/features/admin/types";

export function AdminOpenChatVisitChart({ posts }: { readonly posts: AdminOpenChatVisits["posts"] }) {
  const topPosts = posts.slice(0, 5);
  const max = Math.max(0, ...topPosts.map((post) => post.visitCount));

  return (
    <figure className="rounded-card border border-border bg-card p-4 sm:p-5">
      <figcaption>
        <h3 className="text-base font-bold">인기 공고 TOP 5</h3>
        <p className="mt-1 text-xs leading-5 text-muted">선택한 게시일 범위의 공고별 누적 링크 방문</p>
      </figcaption>
      {max === 0 ? (
        <p className="py-8 text-center text-sm text-muted">아직 집계된 링크 방문이 없어요.</p>
      ) : (
        <ol className="mt-5 grid gap-4" aria-label="공고별 누적 링크 방문 비교">
          {topPosts.map((post, index) => (
            <li key={post.postId} className="group grid grid-cols-[1.5rem_minmax(0,1fr)_auto] items-start gap-x-3 gap-y-2">
              <span className="num pt-0.5 text-sm font-bold text-muted" aria-label={`${index + 1}위`}>{index + 1}</span>
              <a href={adminAuditionPostRoutes.preview(post.postId)} target="_blank" rel="noopener noreferrer" aria-label={`${post.title} · 미리보기 (새 창)`} className="break-words text-sm leading-5 hover:text-brand hover:underline">{post.title}</a>
              <span className="num whitespace-nowrap text-sm font-bold">{post.visitCount.toLocaleString("ko-KR")}<span className="ml-0.5 font-normal text-muted">회</span></span>
              <div className="col-start-2 col-end-4 h-2 overflow-hidden rounded-full bg-surface" aria-hidden="true">
                <div className={`h-full rounded-full group-hover:bg-brand-strong group-focus-within:bg-brand-strong ${index === 0 ? "bg-brand" : "bg-brand/60"}`} style={{ width: `${post.visitCount / max * 100}%` }} />
              </div>
            </li>
          ))}
        </ol>
      )}
    </figure>
  );
}

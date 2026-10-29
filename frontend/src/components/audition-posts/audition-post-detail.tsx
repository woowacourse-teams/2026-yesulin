"use client";

import { AuditionRequestError } from "@/features/auditions/api-client";
import { ScreenError } from "@/components/auditions/screen-status";
import { useEffect, useRef, useState } from "react";
import { ANALYTICS_READY_EVENT } from "@/features/analytics/consent";
import { trackPostView } from "@/features/analytics/product-analytics";
import { getAuditionPost, recordAuditionPostView } from "@/features/audition-posts/api";
import { deadlineBadge, formatDeadline, formatPostedDate, kstToday } from "@/features/audition-posts/format";
import type { AuditionPost } from "@/features/audition-posts/types";
import { publicViewCount, viewCountClock } from "@/features/audition-posts/view-count";
import { CompanyPendingCard, CompanySummaryCard } from "@/components/companies/company-summary-card";
import { AuditionPostContent } from "./audition-post-content";
import { DeadlineChip } from "./audition-post-badges";
import { AuditionPostScreen, MissingAuditionPost } from "./audition-post-screen";

type DetailState =
  | { readonly status: "loading" }
  | { readonly status: "missing" }
  | { readonly status: "error" }
  | { readonly status: "ready"; readonly post: AuditionPost };

/** 상세는 서버가 미리 읽은 공고를 쓰고, 목 환경·서버 API 미설정 시 브라우저에서 읽는다. */
export function AuditionPostRoute({ postId, initialPost }: {
  readonly postId: string;
  readonly initialPost: AuditionPost | null;
}) {
  const [state, setState] = useState<DetailState>(
    initialPost ? { status: "ready", post: initialPost } : { status: "loading" },
  );

  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    if (initialPost && reloadToken === 0) return;
    let active = true;
    getAuditionPost(postId)
      .then((post) => { if (active) setState({ status: "ready", post }); })
      .catch((cause) => {
        console.error("[공고 상세 조회 실패]", cause);
        if (active) setState({ status: cause instanceof AuditionRequestError && cause.status === 404 ? "missing" : "error" });
      });
    return () => { active = false; };
  }, [postId, initialPost, reloadToken]);

  return (
    <AuditionPostScreen>
      {state.status === "loading" ? <DetailSkeleton /> : null}
      {state.status === "missing" ? <MissingAuditionPost /> : null}
      {state.status === "error" ? <ScreenError message="공고를 불러오지 못했어요." onRetry={() => { setState({ status: "loading" }); setReloadToken((value) => value + 1); }} /> : null}
      {state.status === "ready" ? <AuditionPostDetail post={state.post} /> : null}
    </AuditionPostScreen>
  );
}

function AuditionPostDetail({ post }: { readonly post: AuditionPost }) {
  const analyticsViewKey = useRef<string | null>(null);
  useEffect(() => {
    analyticsViewKey.current ??= crypto.randomUUID();
    const key = `${post.id}:${analyticsViewKey.current}`;
    const record = () => { void trackPostView(post.id, key, post.sourceUrl); };
    record();
    window.addEventListener(ANALYTICS_READY_EVENT, record);
    return () => window.removeEventListener(ANALYTICS_READY_EVENT, record);
  }, [post.id, post.sourceUrl]);
  const [today] = useState(() => kstToday());
  const [now] = useState(() => viewCountClock());
  const [viewCount, setViewCount] = useState(post.viewCount);

  useEffect(() => {
    let active = true;
    recordAuditionPostView(post.id)
      .then((counted) => { if (active && counted) setViewCount((count) => count + 1); })
      .catch((cause) => console.error("[공고 조회수 기록 실패]", cause));
    return () => { active = false; };
  }, [post.id]);
  const postedDate = formatPostedDate(post.postedAt);

  return (
    <>
      <article className="notebook-post-detail mt-3 overflow-hidden rounded-card border border-border bg-card">
        <header className="border-b border-border-soft px-5 py-6 sm:px-8 sm:py-8">
          <p className="flex flex-wrap items-center gap-2 text-sm">
            {post.category ? <span className="font-semibold text-brand">{post.category}</span> : null}
            <DeadlineChip badge={deadlineBadge(post, today)} />
          </p>
          <h1 className="mt-3 text-[clamp(22px,3vw,30px)] font-bold leading-snug tracking-[-0.03em]">{post.title}</h1>
          <dl className="mt-5 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
            <MetaRow label="작성">{post.authorName || "미기재"}</MetaRow>
            <MetaRow label="페이">{post.pay || "미기재"}</MetaRow>
            <MetaRow label="마감">{formatDeadline(post)}</MetaRow>
            {postedDate ? <MetaRow label="게시일"><span className="num">{postedDate}</span></MetaRow> : null}
            <MetaRow label="조회"><span className="num" suppressHydrationWarning>{publicViewCount({ ...post, viewCount }, now).toLocaleString("ko-KR")}</span></MetaRow>
            {post.sourceUrl ? (
              <MetaRow label="출처">
                <a
                  href={post.sourceUrl}
                  target="_blank"
                  rel="nofollow noopener noreferrer"
                  aria-label={`${post.source} 원문 공고 새 창으로 보기`}
                  className="text-muted-strong underline-offset-2 hover:text-brand hover:underline"
                >
                  {post.source}
                </a>
              </MetaRow>
            ) : null}
          </dl>
        </header>

        <AuditionPostContent post={post} analyticsPostId={post.id} />
      </article>
      {post.company ? <CompanySummaryCard company={post.company} /> : <CompanyPendingCard authorName={post.authorName} />}
    </>
  );
}

function MetaRow({ label, children }: { readonly label: string; readonly children: React.ReactNode }) {
  return (
    <div className="flex min-w-0 gap-3">
      <dt className="w-12 shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 font-medium">{children}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div role="status" aria-label="공고 불러오는 중" className="mt-3 animate-pulse space-y-4 rounded-card border border-border bg-card px-5 py-8 sm:px-8">
      <div className="h-4 w-1/5 rounded bg-border-soft" />
      <div className="h-7 w-4/5 rounded bg-border-soft" />
      <div className="h-4 w-2/3 rounded bg-border-soft" />
      <div className="h-40 rounded bg-border-soft" />
      <p className="sr-only">공고를 불러오고 있습니다.</p>
    </div>
  );
}

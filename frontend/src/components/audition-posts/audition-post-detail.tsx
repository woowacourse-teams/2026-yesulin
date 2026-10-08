"use client";

import { useEffect, useState } from "react";
import { getAuditionPost, recordAuditionPostView } from "@/features/audition-posts/api";
import { deadlineBadge, formatDeadline, formatFileSize, formatPostedDate, kstToday } from "@/features/audition-posts/format";
import type { AuditionPost } from "@/features/audition-posts/types";
import { DeadlineChip } from "./audition-post-badges";
import { AuditionPostScreen, MissingAuditionPost } from "./audition-post-screen";

type DetailState =
  | { readonly status: "loading" }
  | { readonly status: "missing" }
  | { readonly status: "ready"; readonly post: AuditionPost };

/** 상세는 서버가 미리 읽은 공고를 쓰고, 목 환경·서버 API 미설정 시 브라우저에서 읽는다. */
export function AuditionPostRoute({ postId, initialPost }: {
  readonly postId: string;
  readonly initialPost: AuditionPost | null;
}) {
  const [state, setState] = useState<DetailState>(
    initialPost ? { status: "ready", post: initialPost } : { status: "loading" },
  );

  useEffect(() => {
    if (initialPost) return;
    let active = true;
    getAuditionPost(postId)
      .then((post) => { if (active) setState({ status: "ready", post }); })
      .catch((cause) => {
        console.error("[공고 상세 조회 실패]", cause);
        if (active) setState({ status: "missing" });
      });
    return () => { active = false; };
  }, [postId, initialPost]);

  return (
    <AuditionPostScreen>
      {state.status === "loading" ? <DetailSkeleton /> : null}
      {state.status === "missing" ? <MissingAuditionPost /> : null}
      {state.status === "ready" ? <AuditionPostDetail post={state.post} /> : null}
    </AuditionPostScreen>
  );
}

function AuditionPostDetail({ post }: { readonly post: AuditionPost }) {
  const [today] = useState(() => kstToday());
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
    <article className="mt-3 overflow-hidden rounded-card border border-border bg-card">
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
          <MetaRow label="조회"><span className="num">{viewCount.toLocaleString("ko-KR")}</span></MetaRow>
          <MetaRow label="출처">
            <a
              href={post.sourceUrl}
              target="_blank"
              rel="nofollow noopener noreferrer"
              aria-label={`${post.source} 원문 공고 새 창으로 보기`}
              className="text-muted-strong underline-offset-2 hover:text-brand hover:underline"
            >
              {post.source} <span aria-hidden="true">↗</span>
            </a>
          </MetaRow>
        </dl>
      </header>

      <div
        className="post-body px-5 py-6 sm:px-8 sm:py-8"
        // 서버가 허용 태그만 남기고 링크·사진 주소를 검사한 HTML이다.
        dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
      />

      {post.attachments.length ? (
        <section aria-labelledby="post-attachments" className="border-t border-border-soft px-5 py-6 sm:px-8">
          <h2 id="post-attachments" className="text-base font-bold">첨부파일 <span className="num text-muted">{post.attachments.length}</span></h2>
          <ul className="mt-3 flex flex-col gap-2">
            {post.attachments.map((attachment) => (
              <li key={attachment.url}>
                <a
                  href={attachment.url}
                  download={attachment.name}
                  className="flex min-h-12 items-center gap-3 rounded-control border border-border bg-surface px-4 py-2 text-sm hover:border-brand-line hover:bg-brand-soft"
                >
                  <span aria-hidden="true" className="text-muted">⤓</span>
                  <span className="min-w-0 flex-1 break-all font-semibold">{attachment.name}</span>
                  <span className="num shrink-0 text-xs text-muted">{formatFileSize(attachment.size)}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {post.tags.length ? (
        <ul aria-label="태그" className="flex flex-wrap gap-2 border-t border-border-soft px-5 py-5 sm:px-8">
          {post.tags.map((tag) => (
            <li key={tag} className="rounded-full bg-surface px-3 py-1 text-xs font-semibold text-muted-strong">#{tag}</li>
          ))}
        </ul>
      ) : null}
    </article>
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
    <div aria-label="공고 불러오는 중" className="mt-3 animate-pulse space-y-4 rounded-card border border-border bg-card px-5 py-8 sm:px-8">
      <div className="h-4 w-1/5 rounded bg-border-soft" />
      <div className="h-7 w-4/5 rounded bg-border-soft" />
      <div className="h-4 w-2/3 rounded bg-border-soft" />
      <div className="h-40 rounded bg-border-soft" />
      <p className="sr-only">공고를 불러오고 있습니다.</p>
    </div>
  );
}

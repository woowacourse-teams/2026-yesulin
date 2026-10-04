"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LandingFooter, LandingHeader } from "@/components/landing/landing-header";
import { getAuditionPost } from "@/features/audition-posts/api";
import { deadlineBadge, formatDeadline, formatFileSize, formatPostedDate, kstToday } from "@/features/audition-posts/format";
import { auditionPostRoutes, type AuditionPost } from "@/features/audition-posts/types";
import { DeadlineChip } from "./audition-post-badges";

type DetailState =
  | { readonly status: "loading" }
  | { readonly status: "missing" }
  | { readonly status: "ready"; readonly post: AuditionPost };

/** 상세는 서버가 미리 읽은 공고를 쓰고, 목 환경이나 조회 실패로 비어 있으면 브라우저에서 다시 읽는다. */
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
    <main className="min-h-screen break-keep bg-surface text-foreground wrap-break-word">
      <LandingHeader service="applicant" />
      <div className="mx-auto max-w-[800px] px-5 pb-20 pt-6 sm:px-8 md:pt-10">
        <Link
          href={auditionPostRoutes.list()}
          className="-ml-2 inline-flex min-h-11 items-center rounded-control px-2 text-sm font-semibold text-muted-strong hover:bg-white hover:text-foreground"
        >
          ← 공고 목록
        </Link>
        {state.status === "loading" ? <DetailSkeleton /> : null}
        {state.status === "missing" ? <MissingPost /> : null}
        {state.status === "ready" ? <AuditionPostDetail post={state.post} /> : null}
      </div>
      <LandingFooter />
    </main>
  );
}

function AuditionPostDetail({ post }: { readonly post: AuditionPost }) {
  const [today] = useState(() => kstToday());
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

function MissingPost() {
  return (
    <section className="mt-3 rounded-card border border-border bg-card px-6 py-14 text-center">
      <h1 className="text-lg font-bold">공고를 찾을 수 없어요</h1>
      <p className="mt-2 text-sm text-muted-strong">내려간 공고이거나 주소가 바뀌었을 수 있어요.</p>
      <Link
        href={auditionPostRoutes.list()}
        className="mt-4 inline-flex min-h-11 items-center rounded-control px-3 text-sm font-semibold text-brand hover:bg-brand-soft"
      >
        공고 목록 보기
      </Link>
    </section>
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

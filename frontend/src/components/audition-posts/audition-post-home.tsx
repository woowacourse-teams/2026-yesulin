"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ScreenError } from "@/components/auditions/screen-status";
import { LandingFooter, LandingHeader } from "@/components/landing/landing-header";
import { getAuditionPosts } from "@/features/audition-posts/api";
import { kstToday } from "@/features/audition-posts/format";
import {
  AUDITION_POST_PAGE_SIZE,
  auditionPostRoutes,
  type AuditionPostPage,
  type AuditionPostQuery,
} from "@/features/audition-posts/types";
import { AuditionAlertBanner } from "./audition-alert-banner";
import { AuditionPostCard } from "./audition-post-card";
import { AuditionPostPagination } from "./audition-post-pagination";

type ListState =
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | { readonly status: "ready"; readonly page: AuditionPostPage };

const CHIP_CLASS =
  "inline-flex min-h-9 items-center gap-1 whitespace-nowrap rounded-full border px-3 py-1.5 text-base font-semibold transition-[background-color,border-color,color] duration-150 lg:text-dense";

/**
 * 메인 페이지. 운영자가 게시한 공고를 원문 작성 최신순으로 12건씩 번호 페이지로 보여 준다. 조건은 주소
 * (`?page=2&closed=1`)에 두고, 서버가 미리 읽은 페이지가 없으면(목 환경·조회 실패) 브라우저에서 읽는다.
 * 주소가 바뀌면 라우트가 이 컴포넌트를 새로 그린다.
 */
export function AuditionPostHome({ query, initialPage }: {
  readonly query: AuditionPostQuery;
  readonly initialPage: AuditionPostPage | null;
}) {
  const [state, setState] = useState<ListState>(
    initialPage ? { status: "ready", page: initialPage } : { status: "loading" },
  );
  const [today] = useState(() => kstToday());
  const { page, includeClosed } = query;

  const load = useCallback(() => {
    let active = true;
    getAuditionPosts({ page, includeClosed })
      .then((next) => { if (active) setState({ status: "ready", page: next }); })
      .catch((cause) => {
        console.error("[공고 목록 조회 실패]", cause);
        if (active) setState({ status: "error" });
      });
    return () => { active = false; };
  }, [page, includeClosed]);

  useEffect(() => {
    if (initialPage) return;
    return load();
  }, [initialPage, load]);

  return (
    <main className="min-h-screen break-keep bg-surface text-foreground wrap-break-word">
      <LandingHeader service="applicant" />
      <div className="mx-auto max-w-[1280px] px-5 pb-20 pt-6 sm:px-8 md:pt-8 lg:px-10">
        <AuditionAlertBanner />
        <section className="mt-8 border-b border-border pb-7 md:mt-10">
          <p className="text-sm font-semibold text-brand">공연예술 오디션 공고</p>
          <h1 className="mt-3 text-[clamp(26px,3.6vw,38px)] font-bold leading-tight tracking-[-0.035em]">
            {includeClosed ? "전체 공고" : "지금 모집 중인 공고"}
          </h1>
          <p className="mt-2 text-base text-muted-strong">연극·뮤지컬·퍼포먼스 배우와 단원, 기획사 모집 공고를 한곳에서 확인하세요.</p>
        </section>
        <div className="pt-6">
          {state.status === "loading" ? <PostListSkeleton /> : null}
          {state.status === "error" ? (
            <ScreenError
              message="공고 목록을 불러오지 못했어요."
              onRetry={() => { setState({ status: "loading" }); load(); }}
            />
          ) : null}
          {state.status === "ready" ? <PostList data={state.page} includeClosed={includeClosed} today={today} /> : null}
        </div>
      </div>
      <LandingFooter />
    </main>
  );
}

function PostList({ data, includeClosed, today }: {
  readonly data: AuditionPostPage;
  readonly includeClosed: boolean;
  readonly today: string;
}) {
  return (
    <>
      <nav aria-label="모집 상태" className="mb-5 flex flex-wrap gap-2">
        <FilterLink href={auditionPostRoutes.list()} current={!includeClosed} label="모집 중" count={data.openCount} />
        <FilterLink href={auditionPostRoutes.list({ includeClosed: true })} current={includeClosed} label="마감 포함" count={data.allCount} />
      </nav>
      {data.posts.length ? (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.posts.map((post) => <AuditionPostCard key={post.id} post={post} today={today} />)}
        </ul>
      ) : (
        <EmptyPosts data={data} includeClosed={includeClosed} />
      )}
      <AuditionPostPagination page={data.page} totalPages={data.totalPages} includeClosed={includeClosed} />
    </>
  );
}

function FilterLink({ href, current, label, count }: {
  readonly href: string;
  readonly current: boolean;
  readonly label: string;
  readonly count: number;
}) {
  return (
    <Link
      href={href}
      aria-current={current ? "true" : undefined}
      className={`${CHIP_CLASS} ${current
        ? "border-foreground bg-foreground text-white shadow-[var(--shadow-1)]"
        : "border-border bg-card text-muted-strong hover:border-brand-line hover:bg-brand-soft hover:text-brand"}`}
    >
      {label} <span className="num">{count}</span>
    </Link>
  );
}

function EmptyPosts({ data, includeClosed }: { readonly data: AuditionPostPage; readonly includeClosed: boolean }) {
  const outOfRange = data.totalElements > 0;
  const showClosedLink = !outOfRange && !includeClosed && data.allCount > 0;
  return (
    <section className="rounded-card border border-border bg-card px-6 py-14 text-center">
      <h2 className="text-lg font-bold">
        {outOfRange ? "이 페이지에는 공고가 없어요" : includeClosed ? "아직 올라온 공고가 없어요" : "지금 모집 중인 공고가 없어요"}
      </h2>
      <p className="mt-2 text-sm text-muted-strong">새 공고가 올라오면 이곳과 카카오톡 오픈채팅에서 안내할게요.</p>
      {outOfRange || showClosedLink ? (
        <Link
          href={auditionPostRoutes.list({ includeClosed: includeClosed || showClosedLink })}
          className="mt-3 inline-flex min-h-11 items-center rounded-control px-3 text-sm font-semibold text-brand hover:bg-brand-soft"
        >
          {outOfRange ? "첫 페이지로" : "마감된 공고 보기"}
        </Link>
      ) : null}
    </section>
  );
}

function PostListSkeleton() {
  return (
    <div aria-label="공고 목록 불러오는 중" className="grid animate-pulse gap-3 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: Math.min(6, AUDITION_POST_PAGE_SIZE) }, (_, item) => (
        <div key={item} className="min-h-36 space-y-3 rounded-card border border-border bg-card p-5">
          <div className="h-4 w-1/4 rounded bg-border-soft" />
          <div className="h-5 w-4/5 rounded bg-border-soft" />
          <div className="h-4 w-1/2 rounded bg-border-soft" />
        </div>
      ))}
      <p className="sr-only">공고 목록을 불러오고 있습니다.</p>
    </div>
  );
}

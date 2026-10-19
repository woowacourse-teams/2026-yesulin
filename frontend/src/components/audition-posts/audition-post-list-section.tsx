"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ScreenError } from "@/components/auditions/screen-status";
import { getAuditionPosts } from "@/features/audition-posts/api";
import { kstToday } from "@/features/audition-posts/format";
import { AUDITION_LANDING_CATEGORIES, auditionPostRoutes, type AuditionLandingCategory, type AuditionPostPage, type AuditionPostQuery } from "@/features/audition-posts/types";
import { viewCountClock } from "@/features/audition-posts/view-count";
import { AuditionPostCard } from "./audition-post-card";
import { AuditionPostPagination } from "./audition-post-pagination";
import { SiteIcon } from "@/components/ui/site-icon";

type ListState = { readonly status: "loading" } | { readonly status: "error" } | { readonly status: "ready"; readonly page: AuditionPostPage };

/** 공고 조회·필터·빈 상태를 공유하고 메인에서만 최대 3개를 보여 준다. */
export function AuditionPostListSection({ query, initialPage, preview = false }: {
  readonly query: AuditionPostQuery;
  readonly initialPage: AuditionPostPage | null;
  readonly preview?: boolean;
}) {
  const [state, setState] = useState<ListState>(initialPage ? { status: "ready", page: initialPage } : { status: "loading" });
  const [today] = useState(() => kstToday());
  const [now] = useState(() => viewCountClock());
  const [search, setSearch] = useState("");
  const { page, includeClosed, category } = query;
  const load = useCallback(() => {
    let active = true;
    getAuditionPosts({ page, includeClosed, category }).then((next) => {
      if (active) setState({ status: "ready", page: next });
    }).catch((cause) => {
      console.error("[공고 목록 조회 실패]", cause);
      if (active) setState({ status: "error" });
    });
    return () => { active = false; };
  }, [page, includeClosed, category]);
  useEffect(() => { if (!initialPage) return load(); }, [initialPage, load]);

  return <section id="auditions" className="notebook-section">
    <div className="notebook-section-heading">
      <div className="notebook-section-title"><h1>{category ? `${category} 오디션 공고` : "오디션 공고"}</h1><p>모집 조건과 마감일을 확인해보세요.</p></div>
      {preview ? <Link href={auditionPostRoutes.list()} className="notebook-text-link">전체 보기</Link> : null}
    </div>
    <div className={preview ? "notebook-toolbar is-preview" : "notebook-category-row"}>
      <nav aria-label="오디션 분야" className="notebook-category-tabs">
        <FilterLink href={auditionPostRoutes.list({ includeClosed })} current={!category} label="전체 분야" categoryTab />
        {Object.values(AUDITION_LANDING_CATEGORIES).map((item) => <FilterLink key={item} href={auditionPostRoutes.list({ category: item, includeClosed })} current={category === item} label={item} categoryTab />)}
      </nav>
      {preview ? <RecruitmentFilters query={query} data={state.status === "ready" ? state.page : undefined} /> : null}
    </div>
    {!preview ? <div className="notebook-toolbar">
      <RecruitmentFilters query={query} data={state.status === "ready" ? state.page : undefined} />
      <label className="notebook-search"><SiteIcon name="search" /><span className="sr-only">이 페이지 공고 검색</span><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="이 페이지 공고명·작성자 검색" /></label>
    </div> : null}
    {state.status === "loading" ? <div role="status" aria-label="공고 목록 불러오는 중" className="notebook-post-grid animate-pulse motion-reduce:animate-none">{Array.from({ length: preview ? 3 : 12 }, (_, item) => <div key={item} className="h-72 rounded-card border border-border bg-card" />)}</div> : null}
    {state.status === "error" ? <ScreenError message="공고 목록을 불러오지 못했어요." onRetry={() => { setState({ status: "loading" }); load(); }} /> : null}
    {state.status === "ready" ? <PostList data={state.page} query={query} today={today} now={now} search={search.trim()} preview={preview} onResetSearch={() => setSearch("")} /> : null}
  </section>;
}

function PostList({ data, query, today, now, search, preview, onResetSearch }: {
  readonly data: AuditionPostPage;
  readonly query: AuditionPostQuery;
  readonly today: string;
  readonly now: number;
  readonly search: string;
  readonly preview: boolean;
  readonly onResetSearch: () => void;
}) {
  const { includeClosed, category } = query;
  const matching = search ? data.posts.filter((post) => `${post.title} ${post.authorName}`.toLocaleLowerCase().includes(search.toLocaleLowerCase())) : data.posts;
  const visible = preview ? matching.slice(0, 3) : matching;
  return <>
    {!preview ? <p className="notebook-list-note" role="status">{search ? `이 페이지 검색 결과 ${matching.length}개` : `공개 공고 ${data.totalElements.toLocaleString("ko-KR")}개 · ${data.page + 1}페이지`}</p> : null}
    {visible.length ? <ul className="notebook-post-grid" id="audition-post-list">{visible.map((post) => <AuditionPostCard key={post.id} post={post} today={today} now={now} notebook />)}</ul> : search ? <div className="notebook-empty"><p>이 페이지에 검색어와 일치하는 공고가 없어요.</p><button type="button" className="notebook-outline-button" onClick={onResetSearch}>검색 초기화</button></div> : <EmptyPosts data={data} includeClosed={includeClosed} category={category} />}
    {preview && data.totalElements > visible.length ? <div className="notebook-list-actions"><Link href={auditionPostRoutes.list()} className="notebook-outline-button">전체 공고 보기</Link></div> : null}
    {!preview ? <AuditionPostPagination page={data.page} totalPages={data.totalPages} includeClosed={includeClosed} category={category} /> : null}
  </>;
}

function RecruitmentFilters({ query, data }: { readonly query: AuditionPostQuery; readonly data?: AuditionPostPage }) {
  return <nav aria-label="모집 상태" className="notebook-filters notebook-recruitment-filters">
    <FilterLink href={auditionPostRoutes.list({ category: query.category })} current={!query.includeClosed} label="모집 중" count={data?.openCount} />
    <FilterLink href={auditionPostRoutes.list({ includeClosed: true, category: query.category })} current={query.includeClosed} label="마감 포함" count={data?.allCount} />
  </nav>;
}

function FilterLink({ href, current, label, count, categoryTab = false }: { readonly href: string; readonly current: boolean; readonly label: string; readonly count?: number; readonly categoryTab?: boolean }) {
  return <Link href={href} aria-current={current ? "true" : undefined} className={categoryTab ? "notebook-category-tab" : "notebook-filter"}>{label}{count !== undefined ? <span className="num">{count.toLocaleString("ko-KR")}</span> : null}</Link>;
}

function EmptyPosts({ data, includeClosed, category }: { readonly data: AuditionPostPage; readonly includeClosed: boolean; readonly category?: AuditionLandingCategory }) {
  const outOfRange = data.totalElements > 0;
  const showClosedLink = !outOfRange && !includeClosed && data.allCount > 0;
  return <section className="notebook-empty"><h2 className="text-lg font-bold">{outOfRange ? "이 페이지에는 공고가 없어요" : includeClosed ? "아직 올라온 공고가 없어요" : "지금 모집 중인 공고가 없어요"}</h2><p className="mt-2">새 공고가 올라오면 이곳과 카카오톡 오픈채팅에서 안내할게요.</p>{outOfRange || showClosedLink ? <Link href={auditionPostRoutes.list({ includeClosed: includeClosed || showClosedLink, category })} className="notebook-outline-button">{outOfRange ? "첫 페이지로" : "마감된 공고 보기"}</Link> : null}</section>;
}

"use client";

import { useEffect, useState } from "react";
import { ScreenError } from "@/components/auditions/screen-status";
import { NotebookPostCard } from "@/components/audition-posts/notebook-post-card";
import { getAuditionPosts } from "@/features/audition-posts/api";
import { HOME_DEADLINE_SIZE, HOME_LATEST_POOL_SIZE } from "@/features/audition-posts/home-query";
import { kstToday } from "@/features/audition-posts/format";
import { AUDITION_LANDING_CATEGORIES, auditionPostRoutes, type AuditionPostPage, type AuditionPostSummary } from "@/features/audition-posts/types";
import { publicViewCount, viewCountClock } from "@/features/audition-posts/view-count";
import { PosterRow, PosterRowSkeleton } from "./poster-row";

const ROW_SIZE = 12;
const RANKING_SIZE = 10;
const ALL_CATEGORIES = "전체";

type Pages = { readonly latest: AuditionPostPage; readonly deadline: AuditionPostPage };
type PagesState = { readonly status: "loading" } | { readonly status: "error" } | { readonly status: "ready"; readonly pages: Pages };

function initialState(latest: AuditionPostPage | null, deadline: AuditionPostPage | null): PagesState {
  if (latest && deadline) return { status: "ready", pages: { latest, deadline } };
  return { status: "loading" };
}

async function loadPages(): Promise<Pages> {
  const [latest, deadline] = await Promise.all([
    getAuditionPosts({ page: 0, includeClosed: false }, HOME_LATEST_POOL_SIZE),
    getAuditionPosts({ page: 0, includeClosed: false, sort: "deadline" }, HOME_DEADLINE_SIZE),
  ]);
  return { latest, deadline };
}

/** 홈의 공고 줄. 서버가 미리 읽지 못한 목 환경·조회 실패에서는 브라우저에서 다시 읽는다. */
export function HomePostRows({ renderedAt, initialLatest, initialDeadline }: {
  readonly renderedAt: number;
  readonly initialLatest: AuditionPostPage | null;
  readonly initialDeadline: AuditionPostPage | null;
}) {
  const [state, setState] = useState<PagesState>(() => initialState(initialLatest, initialDeadline));
  const today = kstToday(new Date(renderedAt));
  const now = viewCountClock(renderedAt);
  const retry = () => { setState({ status: "loading" }); };
  useEffect(() => {
    if (state.status !== "loading") return;
    let active = true;
    loadPages().then((pages) => { if (active) setState({ status: "ready", pages }); }).catch(() => { if (active) setState({ status: "error" }); });
    return () => { active = false; };
  }, [state.status]);
  if (state.status === "error") return <ScreenError message="공고를 불러오지 못했어요." onRetry={retry} />;
  if (state.status === "loading") return <><LoadingRow title="새로 올라온 공고" /><LoadingRow title="마감 임박 공고" /></>;
  const { latest, deadline } = state.pages;
  return <>
    <PostRow title="새로 올라온 공고" moreHref={auditionPostRoutes.list()} posts={latest.posts.slice(0, ROW_SIZE)} today={today} now={now} />
    <PostRow title="마감 임박 공고" moreHref={auditionPostRoutes.list({ sort: "deadline" })} posts={deadline.posts} today={today} now={now} />
    <PopularRow posts={latest.posts} today={today} now={now} />
  </>;
}

function LoadingRow({ title }: { readonly title: string }) {
  return <section className="home-row" aria-label={title}><div className="home-row-heading"><h2>{title}</h2></div><PosterRowSkeleton /></section>;
}

function PostRow({ title, moreHref, posts, today, now }: {
  readonly title: string;
  readonly moreHref: string;
  readonly posts: readonly AuditionPostSummary[];
  readonly today: string;
  readonly now: number;
}) {
  if (posts.length === 0) return null;
  return <PosterRow title={title} label={title} moreHref={moreHref}>
    {posts.map((post) => <NotebookPostCard key={post.id} post={post} today={today} now={now} />)}
  </PosterRow>;
}

/** 조회수가 많은 모집 중 공고. 최신 공고 묶음 안에서 분야별로 순위를 매긴다. */
function PopularRow({ posts, today, now }: { readonly posts: readonly AuditionPostSummary[]; readonly today: string; readonly now: number }) {
  const [category, setCategory] = useState<string>(ALL_CATEGORIES);
  const ranked = rankByViews(posts, category, now);
  if (posts.length === 0) return null;
  const chips = <div className="home-chips" role="group" aria-label="많이 본 공고 분야">
    {[ALL_CATEGORIES, ...Object.values(AUDITION_LANDING_CATEGORIES)].map((item) => <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>)}
  </div>;
  return <PosterRow title="많이 본 공고" label="많이 본 공고" toolbar={chips}>
    {ranked.map((post, index) => <NotebookPostCard key={post.id} post={post} today={today} now={now} rank={index + 1} />)}
    {ranked.length === 0 && <li className="home-row-empty">이 분야는 아직 모집 중인 공고가 없어요.</li>}
  </PosterRow>;
}

export function rankByViews(posts: readonly AuditionPostSummary[], category: string, now: number): readonly AuditionPostSummary[] {
  return [...posts]
    .filter((post) => category === ALL_CATEGORIES || post.category === category)
    .sort((left, right) => publicViewCount(right, now) - publicViewCount(left, now))
    .slice(0, RANKING_SIZE);
}

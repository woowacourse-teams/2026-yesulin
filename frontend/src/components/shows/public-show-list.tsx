"use client";

import { useCallback, useEffect, useState } from "react";
import { FallbackImage as Image } from "@/components/ui/fallback-image";
import { ContentState, ContentSkeleton } from "@/components/ui/content-state";
import { SecondaryButton } from "@/components/ui/controls";
import Link from "next/link";
import { ScreenError } from "@/components/auditions/screen-status";
import { getPublicShows } from "@/features/shows/api";
import { formatShowDateTime, hasUpcomingShowSession, isShowBookingClosed } from "@/features/shows/format";
import { SHOW_GENRE_LABELS, SHOW_GENRES, showRoutes, type PublicShowSummary, type ShowGenre } from "@/features/shows/types";
import { SiteFooter } from "@/components/policies/site-footer";
import { NotebookListHeading, NotebookPageMain } from "@/components/landing/notebook-page-main";
import { ShowPageHeader } from "./show-page-header";

type ListState =
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | { readonly status: "ready"; readonly shows: readonly PublicShowSummary[] };

export function PublicShowList({ initialShows }: { readonly initialShows: readonly PublicShowSummary[] | null }) {
  const [state, setState] = useState<ListState>(() => initialShows === null
    ? { status: "loading" }
    : { status: "ready", shows: initialShows });
  const [genre, setGenre] = useState<ShowGenre | null>(null);

  const load = useCallback(() => {
    let active = true;
    getPublicShows()
      .then((shows) => { if (active) setState({ status: "ready", shows }); })
      .catch((cause) => {
        console.error("[공개 공연 목록 조회 실패]", cause);
        if (active) setState({ status: "error" });
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (initialShows !== null) return;
    return load();
  }, [initialShows, load]);

  return (
    <>
      <ShowPageHeader />
      <NotebookPageMain>
        <NotebookListHeading title="무료 공연" description="보고 싶은 공연을 찾고 무료로 예매해보세요." />
        <div>
          {state.status === "loading" ? <ShowListSkeleton /> : null}
          {state.status === "error" ? (
            <ScreenError
              message="공연 목록을 불러오지 못했어요."
              onRetry={() => { setState({ status: "loading" }); load(); }}
            />
          ) : null}
          {state.status === "ready" && state.shows.length === 0 ? <EmptyShows /> : null}
          {state.status === "ready" && state.shows.length > 0 ? (
            <GenreFilteredShows shows={state.shows} genre={genre} onGenreChange={setGenre} />
          ) : null}
        </div>
      </NotebookPageMain>
      <SiteFooter notebook />
    </>
  );
}

function GenreFilteredShows({ shows, genre, onGenreChange }: {
  readonly shows: readonly PublicShowSummary[];
  readonly genre: ShowGenre | null;
  readonly onGenreChange: (genre: ShowGenre | null) => void;
}) {
  const [now] = useState(Date.now);
  const visibleShows = genre ? shows.filter((show) => show.genre === genre) : shows;
  const upcoming = visibleShows.filter((show) => !isShowBookingClosed(show, now));
  const ended = visibleShows.filter((show) => isShowBookingClosed(show, now));
  const countOf = (target: ShowGenre | null) => target ? shows.filter((show) => show.genre === target).length : shows.length;
  const options: readonly (ShowGenre | null)[] = [null, ...SHOW_GENRES.filter((option) => countOf(option) > 0)];
  return (
    <>
      <div role="group" aria-label="장르" className="mb-6 flex flex-wrap gap-2">
        {options.map((option) => (
          <button type="button" key={option ?? "ALL"} aria-pressed={genre === option} className="notebook-filter" onClick={() => onGenreChange(option)}>
            {option ? SHOW_GENRE_LABELS[option] : "전체"} <span className="num">{countOf(option)}</span>
          </button>
        ))}
      </div>
      {visibleShows.length ? (
        <>
          <p className="mb-5 text-sm text-muted-strong">회차별 잔여석과 예매 가능 여부는 공연 상세에서 확인해 주세요.</p>
          {upcoming.length ? <ShowGroup title="다가오는 공연" shows={upcoming} now={now} /> : <ContentState className="mb-8" title="지금 예정된 공연이 없어요" description="새 공연이 열리면 이곳에 안내할게요." />}
          {ended.length ? <ShowGroup title="예매 마감" shows={ended} now={now} ended /> : null}
        </>
      ) : (
        <ContentState title={`지금 예매할 수 있는 ${genre ? SHOW_GENRE_LABELS[genre] : "공연"}이 없어요`} description="다른 장르의 공연도 살펴보세요." action={<SecondaryButton onClick={() => onGenreChange(null)}>전체 공연 보기</SecondaryButton>} />
      )}
    </>
  );
}

function ShowGroup({ title, shows, now, ended = false }: { readonly title: string; readonly shows: readonly PublicShowSummary[]; readonly now: number; readonly ended?: boolean }) {
  return <section className="notebook-show-group" aria-label={title}>
    <h2 className="notebook-show-group-heading">{title}<span className="num">{shows.length}개</span></h2>
    <ul className="grid gap-4 min-[900px]:grid-cols-2 min-[1200px]:grid-cols-3">
      {shows.map((show) => <ShowCard key={show.id} show={show} now={now} ended={ended} />)}
    </ul>
  </section>;
}

function ShowCard({ show, now, ended }: { readonly show: PublicShowSummary; readonly now: number; readonly ended: boolean }) {
  // 마감 공연은 미래 회차가 남았을 때만 일정을 보여 주고, 이미 지난 회차를 다음 회차로 안내하지 않는다.
  const nextSessionStartsAt = hasUpcomingShowSession(show, now) ? show.nextSessionStartsAt : null;
  return (
    <li className="min-w-0">
      <Link
        href={showRoutes.detail(show.id)}
        className={`public-show-card group flex min-h-44 overflow-hidden rounded-card border border-border bg-card transition-[border-color,box-shadow] hover:border-brand-line hover:shadow-[var(--shadow-1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand ${ended ? "is-ended" : ""}`}
      >
        <div className="relative w-28 shrink-0 bg-border-soft sm:w-32">
          <Image
            src={show.posterUrl}
            alt={`${show.title} 포스터`}
            fill
            unoptimized
            sizes="(min-width: 640px) 128px, 112px"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        </div>
        <div className="flex min-w-0 flex-1 flex-col px-4 py-4">
          <p className="flex min-w-0 items-center gap-1.5 text-xs">
            <span className="shrink-0 font-semibold text-brand">{SHOW_GENRE_LABELS[show.genre]}</span>
            {show.hostName ? <><span aria-hidden="true" className="text-muted-soft">·</span><span className="truncate text-muted-strong"><span className="sr-only">주최 </span>{show.hostName}</span></> : null}
          </p>
          <h3 className="mt-1 line-clamp-2 text-lg font-bold leading-6 group-hover:text-brand">{show.title}</h3>
          <p className="mt-2 truncate text-sm text-muted-strong">{show.venueName}</p>
          <p className="num mt-auto border-t border-border-soft pt-2 text-xs leading-5 text-muted-strong">
            {ended ? <strong className="font-semibold">예매 마감</strong> : null}
            {ended ? " · " : ""}
            {nextSessionStartsAt ? `다음 회차 ${formatShowDateTime(nextSessionStartsAt)}` : "예정 회차 없음"}
          </p>
        </div>
      </Link>
    </li>
  );
}

function EmptyShows() {
  return <ContentState title="지금 예매할 수 있는 공연이 없어요" description="새 공연이 열리면 이곳에 안내할게요." />;
}

function ShowListSkeleton() {
  return (
    <ContentSkeleton label="공연 목록을 불러오고 있습니다."><div className="grid gap-4 min-[900px]:grid-cols-2 min-[1200px]:grid-cols-3">
      {[0, 1, 2, 3].map((item) => (
        <div key={item} className="flex min-h-44 overflow-hidden rounded-card border border-border bg-card">
          <div className="w-28 shrink-0 bg-border-soft sm:w-32" />
          <div className="min-w-0 flex-1 space-y-3 px-4 py-4">
            <div className="h-4 w-1/3 rounded bg-border-soft" />
            <div className="h-5 w-4/5 rounded bg-border-soft" />
            <div className="h-4 w-2/3 rounded bg-border-soft" />
          </div>
        </div>
      ))}
      </div></ContentSkeleton>
  );
}

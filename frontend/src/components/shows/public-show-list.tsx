"use client";

import { useCallback, useEffect, useState } from "react";
import { ContentState, ContentSkeleton } from "@/components/ui/content-state";
import { SecondaryButton } from "@/components/ui/controls";
import { ScreenError } from "@/components/auditions/screen-status";
import { getPublicShows } from "@/features/shows/api";
import { isShowBookingClosed } from "@/features/shows/format";
import { SHOW_GENRE_LABELS, SHOW_GENRES, type PublicShowSummary, type ShowGenre } from "@/features/shows/types";
import { SiteFooter } from "@/components/policies/site-footer";
import { NotebookListHeading, NotebookPageMain } from "@/components/landing/notebook-page-main";
import { ShowPageHeader } from "./show-page-header";
import { ShowPosterCard } from "./show-poster-card";

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
        <NotebookListHeading title="무료 공연" />
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
      <div role="group" aria-label="장르" className="home-chips notebook-show-genres">
        {options.map((option) => (
          <button type="button" key={option ?? "ALL"} aria-pressed={genre === option} onClick={() => onGenreChange(option)}>
            {option ? SHOW_GENRE_LABELS[option] : "전체"} <span className="num">{countOf(option)}</span>
          </button>
        ))}
      </div>
      {visibleShows.length ? (
        <>
          <p className="mb-5 text-sm text-muted-strong">회차별 잔여석과 예매 가능 여부는 공연 상세에서 확인해 주세요.</p>
          {upcoming.length ? <ShowGroup title="다가오는 공연" shows={upcoming} now={now} /> : <ContentState className="mb-8" title="지금 예정된 공연이 없어요" description="새 공연이 열리면 이곳에 안내할게요." />}
          {ended.length ? <ShowGroup title="예매 마감" shows={ended} now={now} /> : null}
        </>
      ) : (
        <ContentState title={`지금 예매할 수 있는 ${genre ? SHOW_GENRE_LABELS[genre] : "공연"}이 없어요`} description="다른 장르의 공연도 살펴보세요." action={<SecondaryButton onClick={() => onGenreChange(null)}>전체 공연 보기</SecondaryButton>} />
      )}
    </>
  );
}

function ShowGroup({ title, shows, now }: { readonly title: string; readonly shows: readonly PublicShowSummary[]; readonly now: number }) {
  return <section className="notebook-show-group" aria-label={title}>
    <h2 className="notebook-show-group-heading">{title}<span className="num">{shows.length}개</span></h2>
    <ul className="notebook-event-grid">
      {shows.map((show) => <ShowPosterCard key={show.id} show={show} now={now} />)}
    </ul>
  </section>;
}

function EmptyShows() {
  return <ContentState title="지금 예매할 수 있는 공연이 없어요" description="새 공연이 열리면 이곳에 안내할게요." />;
}

function ShowListSkeleton() {
  return <ContentSkeleton label="공연 목록을 불러오고 있습니다."><div className="notebook-event-grid">
    {[0, 1, 2, 3].map((item) => <div key={item} className="notebook-poster-skeleton" />)}
  </div></ContentSkeleton>;
}

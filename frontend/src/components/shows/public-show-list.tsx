"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ScreenError } from "@/components/auditions/screen-status";
import { FilterChip } from "@/components/ui/controls";
import { getPublicShows } from "@/features/shows/api";
import { formatShowDateTime } from "@/features/shows/format";
import { SHOW_GENRE_LABELS, SHOW_GENRES, showRoutes, type PublicShowSummary, type ShowGenre } from "@/features/shows/types";
import { SiteFooter } from "@/components/policies/site-footer";
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
      <main className="min-h-screen break-keep bg-surface pb-16 text-foreground wrap-break-word">
        <ShowPageHeader />
        <div className="mx-auto max-w-[880px] px-5 py-8 md:px-8 md:py-12 min-[1200px]:max-w-[1200px]">
          <section className="border-b border-border pb-8">
            <p className="text-sm font-semibold text-brand">예술in 무료 공연</p>
            <h1 className="mt-3 text-[clamp(28px,4vw,40px)] font-bold leading-tight tracking-[-0.035em]">지금 예매할 수 있는 공연</h1>
            <p className="mt-2 text-base text-muted-strong">로그인 없이 이름과 휴대폰 번호만으로 예매할 수 있어요.</p>
          </section>
          <div className="pt-8">
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
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function GenreFilteredShows({ shows, genre, onGenreChange }: {
  readonly shows: readonly PublicShowSummary[];
  readonly genre: ShowGenre | null;
  readonly onGenreChange: (genre: ShowGenre | null) => void;
}) {
  const visibleShows = genre ? shows.filter((show) => show.genre === genre) : shows;
  const countOf = (target: ShowGenre | null) => target ? shows.filter((show) => show.genre === target).length : shows.length;
  const options: readonly (ShowGenre | null)[] = [null, ...SHOW_GENRES];
  return (
    <>
      <div role="group" aria-label="장르" className="mb-6 flex flex-wrap gap-2">
        {options.map((option) => (
          <FilterChip key={option ?? "ALL"} pressed={genre === option} onClick={() => onGenreChange(option)}>
            {option ? SHOW_GENRE_LABELS[option] : "전체"} <span className="num">{countOf(option)}</span>
          </FilterChip>
        ))}
      </div>
      {visibleShows.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 min-[1200px]:grid-cols-3">
          {visibleShows.map((show) => <ShowCard key={show.id} show={show} />)}
        </ul>
      ) : (
        <section className="rounded-card border border-border bg-card px-6 py-14 text-center">
          <h2 className="text-lg font-bold">지금 예매할 수 있는 {genre ? SHOW_GENRE_LABELS[genre] : "공연"}이 없어요</h2>
          <button type="button" onClick={() => onGenreChange(null)} className="mt-3 inline-flex min-h-11 items-center rounded-control px-3 text-sm font-semibold text-brand hover:bg-brand-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            전체 공연 보기
          </button>
        </section>
      )}
    </>
  );
}

function ShowCard({ show }: { readonly show: PublicShowSummary }) {
  return (
    <li className="min-w-0">
      <Link
        href={showRoutes.detail(show.id)}
        className="group flex min-h-44 overflow-hidden rounded-card border border-border bg-card transition-[border-color,box-shadow] hover:border-brand-line hover:shadow-[var(--shadow-1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
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
          <h2 className="mt-1 line-clamp-2 text-lg font-bold leading-6 group-hover:text-brand">{show.title}</h2>
          <p className="mt-2 truncate text-sm text-muted-strong">{show.venueName}</p>
          <p className="num mt-auto border-t border-border-soft pt-2 text-xs leading-5 text-muted-strong">
            {show.nextSessionStartsAt ? `다음 회차 ${formatShowDateTime(show.nextSessionStartsAt)}` : "예매 가능한 회차 없음"}
          </p>
        </div>
      </Link>
    </li>
  );
}

function EmptyShows() {
  return (
    <section className="rounded-card border border-border bg-card px-6 py-14 text-center">
      <h2 className="text-lg font-bold">지금 예매할 수 있는 공연이 없어요</h2>
      <p className="mt-2 text-sm text-muted-strong">새 공연이 열리면 이곳에 안내할게요.</p>
    </section>
  );
}

function ShowListSkeleton() {
  return (
    <div aria-label="공연 목록 불러오는 중" className="grid animate-pulse gap-3 sm:grid-cols-2 min-[1200px]:grid-cols-3">
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
      <p className="sr-only">공연 목록을 불러오고 있습니다.</p>
    </div>
  );
}

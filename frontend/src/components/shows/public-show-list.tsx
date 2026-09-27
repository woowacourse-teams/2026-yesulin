"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ScreenError } from "@/components/auditions/screen-status";
import { FilterChip } from "@/components/ui/controls";
import { getPublicShows } from "@/features/shows/api";
import { formatShowDateTime } from "@/features/shows/format";
import { SHOW_GENRE_LABELS, SHOW_GENRES, showRoutes, type PublicShowSummary, type ShowGenre } from "@/features/shows/types";
import { ShowPageHeader } from "./show-page-header";

type ListState =
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | { readonly status: "ready"; readonly shows: readonly PublicShowSummary[] };

export function PublicShowList() {
  const [state, setState] = useState<ListState>({ status: "loading" });
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

  useEffect(() => load(), [load]);

  return (
    <main className="min-h-screen bg-surface pb-16 text-foreground">
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
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 min-[1200px]:grid-cols-4">
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
        className="group block rounded-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
      >
        <div className="relative aspect-[3/4] overflow-hidden rounded-card border border-border bg-border-soft">
          <Image
            src={show.posterUrl}
            alt={`${show.title} 포스터`}
            fill
            unoptimized
            sizes="(min-width: 1200px) 280px, (min-width: 640px) 33vw, 50vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
          />
        </div>
        <p className="mt-3 text-xs font-semibold text-brand">{SHOW_GENRE_LABELS[show.genre]}</p>
        <h2 className="mt-1 line-clamp-2 text-base font-bold leading-6 group-hover:text-brand">{show.title}</h2>
        <p className="mt-1 truncate text-sm text-muted-strong">{show.venueName}</p>
        <p className="num mt-1 text-sm text-muted">
          {show.nextSessionStartsAt ? `다음 회차 ${formatShowDateTime(show.nextSessionStartsAt)}` : "예매 가능한 회차 없음"}
        </p>
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
    <div aria-label="공연 목록 불러오는 중" className="grid animate-pulse grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 min-[1200px]:grid-cols-4">
      {[0, 1, 2, 3].map((item) => (
        <div key={item}>
          <div className="aspect-[3/4] rounded-card bg-border-soft" />
          <div className="mt-3 h-5 w-3/4 rounded bg-border-soft" />
          <div className="mt-2 h-4 w-1/2 rounded bg-border-soft" />
        </div>
      ))}
      <p className="sr-only">공연 목록을 불러오고 있습니다.</p>
    </div>
  );
}

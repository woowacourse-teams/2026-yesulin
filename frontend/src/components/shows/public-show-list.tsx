"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ScreenError } from "@/components/auditions/screen-status";
import { getPublicShows } from "@/features/shows/api";
import { formatShowDateTime } from "@/features/shows/format";
import { showRoutes, type PublicShowSummary } from "@/features/shows/types";
import { ShowPageHeader } from "./show-page-header";

type ListState =
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | { readonly status: "ready"; readonly shows: readonly PublicShowSummary[] };

export function PublicShowList() {
  const [state, setState] = useState<ListState>({ status: "loading" });

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
            <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 min-[1200px]:grid-cols-4">
              {state.shows.map((show) => <ShowCard key={show.id} show={show} />)}
            </ul>
          ) : null}
        </div>
      </div>
    </main>
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
        <h2 className="mt-3 line-clamp-2 text-base font-bold leading-6 group-hover:text-brand">{show.title}</h2>
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

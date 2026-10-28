"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ScreenError } from "@/components/auditions/screen-status";
import { NotebookListHeading } from "@/components/landing/notebook-page-main";
import { ContentSkeleton, ContentState } from "@/components/ui/content-state";
import { getActorPages } from "@/features/actor-pages/api";
import {
  actorBodyLine,
  actorIdentityLine,
  actorPageRoutes,
  type PublicActorPageList,
  type PublicActorPageSummary,
} from "@/features/actor-pages/types";
import { pageItems } from "@/features/audition-posts/pagination";
import { ActorBookmarkButton } from "./actor-bookmarks";
import { ActorPageScreen, ActorPhoto } from "./actor-page-screen";
import { ActorScreenView } from "./actor-screen-view";

type ListState =
  | { readonly status: "loading" }
  | { readonly status: "error" }
  | { readonly status: "ready"; readonly list: PublicActorPageList };

const GRID = "grid grid-cols-2 gap-x-3 gap-y-6 min-[761px]:grid-cols-3 min-[1100px]:grid-cols-4";

/** 배우 목록은 서버가 미리 읽은 페이지를 쓰고, 목 환경·서버 API 미설정 시 브라우저에서 읽는다. */
export function ActorListRoute({ page, initialList }: { readonly page: number; readonly initialList: PublicActorPageList | null }) {
  const [state, setState] = useState<ListState>(() => initialList === null
    ? { status: "loading" }
    : { status: "ready", list: initialList });

  const load = useCallback(() => {
    let active = true;
    getActorPages(page)
      .then((list) => { if (active) setState({ status: "ready", list }); })
      .catch((cause) => {
        console.error("[배우 목록 조회 실패]", cause);
        if (active) setState({ status: "error" });
      });
    return () => { active = false; };
  }, [page]);

  useEffect(() => {
    if (initialList !== null) return;
    return load();
  }, [initialList, load]);

  return (
    <ActorPageScreen>
      {state.status === "ready" ? <ActorScreenView key={page} screen="actor_list" /> : null}
      <NotebookListHeading title="배우" />
      <p className="-mt-2 mb-6 text-sm leading-6 text-muted-strong">예술in에 프로필 페이지를 공개한 배우들이에요. 최근 소식이 있는 배우부터 보여요.</p>
      {state.status === "loading" ? (
        <ContentSkeleton label="배우 목록 불러오는 중">
          <div className={GRID}>{[0, 1, 2, 3].map((item) => <div key={item}><div className="aspect-[3/4] rounded-card bg-border-soft" /><div className="mt-3 h-5 w-1/2 rounded bg-border-soft" /></div>)}</div>
        </ContentSkeleton>
      ) : null}
      {state.status === "error" ? (
        <ScreenError message="배우 목록을 불러오지 못했어요." onRetry={() => { setState({ status: "loading" }); load(); }} />
      ) : null}
      {state.status === "ready" && state.list.actorPages.length === 0 ? (
        <ContentState
          title={page > 0 ? "이 페이지에는 배우가 없어요" : "아직 공개된 배우 페이지가 없어요"}
          description={page > 0 ? "첫 페이지에서 다시 둘러봐 주세요." : "배우가 프로필 페이지를 공개하면 이곳에 보여요."}
          action={page > 0 ? <Link href={actorPageRoutes.list()} className="font-semibold text-brand hover:underline">첫 페이지로</Link> : undefined}
        />
      ) : null}
      {state.status === "ready" && state.list.actorPages.length > 0 ? (
        <>
          <ul className={GRID}>{state.list.actorPages.map((actor) => <ActorCard key={actor.publicId} actor={actor} />)}</ul>
          <ActorListPagination page={page} totalPages={state.list.totalPages} />
        </>
      ) : null}
    </ActorPageScreen>
  );
}

/** 공연사에게는 사진 위에 관심 배우 저장 버튼이 보인다. 버튼은 링크 밖에 둔다. */
export function ActorCard({ actor, headingLevel = 2 }: { readonly actor: PublicActorPageSummary; readonly headingLevel?: 2 | 3 }) {
  const body = actorBodyLine(actor);
  const Heading = headingLevel === 2 ? "h2" : "h3";
  return (
    <li className="relative min-w-0">
      <Link href={actorPageRoutes.detail(actor.handle)} className="group block rounded-card focus-visible:outline-offset-4">
        <ActorPhoto src={actor.representativePhotoUrl} alt="" className="rounded-card transition-opacity group-hover:opacity-90" />
        <Heading className="mt-3 truncate text-base font-bold group-hover:underline">{actor.name}</Heading>
        <p className="mt-0.5 text-sm text-muted-strong">{actorIdentityLine(actor)}</p>
        {body ? <p className="num text-sm text-muted">{body}</p> : null}
      </Link>
      <div className="absolute right-2 top-2"><ActorBookmarkButton publicId={actor.publicId} name={actor.name} variant="overlay" /></div>
    </li>
  );
}

const PAGE_ITEM = "num inline-flex h-11 min-w-11 items-center justify-center rounded-control px-3 text-sm font-semibold transition-colors";

/** 주소(`?page=`)로 이동하는 번호 페이지. 뒤로 가기·새로고침·공유 때 같은 페이지가 열린다. */
export function ActorListPagination({
  page,
  totalPages,
  href = actorPageRoutes.list,
  label = "배우 목록 페이지",
}: {
  readonly page: number;
  readonly totalPages: number;
  readonly href?: (page: number) => string;
  readonly label?: string;
}) {
  if (totalPages <= 1) return null;
  const link = `${PAGE_ITEM} text-muted-strong hover:bg-white hover:text-foreground`;
  return (
    <nav aria-label={label} className="mt-10 flex flex-wrap items-center justify-center gap-1">
      {page > 0 ? <Link href={href(page - 1)} className={link}>이전<span className="sr-only"> 페이지</span></Link> : null}
      {pageItems(page, totalPages).map((item) => item.kind === "gap" ? (
        <span key={item.key} aria-hidden="true" className="px-1 text-muted">…</span>
      ) : item.page === page ? (
        <span key={item.page} aria-current="page" className={`${PAGE_ITEM} bg-foreground text-white`}>{item.page + 1}</span>
      ) : (
        <Link key={item.page} href={href(item.page)} aria-label={`${item.page + 1}페이지`} className={link}>{item.page + 1}</Link>
      ))}
      {page < totalPages - 1 ? <Link href={href(page + 1)} className={link}>다음<span className="sr-only"> 페이지</span></Link> : null}
    </nav>
  );
}

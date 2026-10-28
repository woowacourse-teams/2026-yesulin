"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PickerEmpty, PickerScreen } from "@/components/auditions/picker-card";
import { ScreenError } from "@/components/auditions/screen-status";
import { SecondaryLink } from "@/components/ui/controls";
import { actorBookmarkRoutes, getActorBookmarks, type ActorBookmarkList } from "@/features/actor-pages/bookmark-api";
import { actorPageRoutes } from "@/features/actor-pages/types";
import { errorMessage } from "@/features/auditions/use-audition-query";
import { ActorBookmarksProvider } from "./actor-bookmarks";
import { ActorCard, ActorListPagination } from "./actor-list";

type ListState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly list: ActorBookmarkList };

const GRID = "grid grid-cols-2 gap-x-3 gap-y-6 min-[761px]:grid-cols-3 min-[1100px]:grid-cols-4";

/**
 * 공연사가 저장한 관심 배우. 저장한 최신순이고, 비공개가 된 배우는 숨기되 한도에는 포함한다고 알려 준다.
 * 카드의 버튼으로 빼거나 다시 저장하면 목록과 저장 수를 다시 읽는다.
 */
export function ProducerActorBookmarks({ page }: { readonly page: number }) {
  const [state, setState] = useState<ListState>({ status: "loading" });

  const load = useCallback(() => {
    let active = true;
    getActorBookmarks(page)
      .then((list) => { if (active) setState({ status: "ready", list }); })
      .catch((cause) => {
        console.error("[관심 배우 목록 조회 실패]", cause);
        if (active) setState({ status: "error", message: errorMessage(cause, "관심 배우를 불러오지 못했어요.") });
      });
    return () => { active = false; };
  }, [page]);

  useEffect(() => load(), [load]);

  return (
    <PickerScreen>
      <div className="mx-auto w-full max-w-[1120px] break-keep wrap-break-word">
        <header className="mb-6 flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-brand">배우 찾기</p>
            <h1 className="mt-1 text-2xl font-bold tracking-[-0.025em] md:text-[28px]">관심 배우</h1>
            <p className="mt-2 text-sm text-muted-strong">배우 목록과 배우 페이지에서 저장한 배우예요. 배우에게는 누가 저장했는지 알리지 않아요.</p>
          </div>
          <SecondaryLink href={actorPageRoutes.list()} className="whitespace-nowrap">배우 둘러보기</SecondaryLink>
        </header>

        {state.status === "error" ? <ScreenError message={state.message} onRetry={() => { setState({ status: "loading" }); load(); }} /> : null}
        {state.status === "loading" ? <p role="status" className="rounded-card border border-border bg-card px-5 py-14 text-center text-muted">관심 배우를 불러오는 중…</p> : null}
        {state.status === "ready" ? <BookmarkSummary list={state.list} /> : null}
        {state.status === "ready" && state.list.actorPages.length === 0 ? (
          page > 0 && state.list.totalElements > 0
            ? <PickerEmpty title="이 페이지에는 관심 배우가 없어요" description="첫 페이지에서 다시 확인해 주세요." action={<Link href={actorBookmarkRoutes.list()} className="font-semibold text-brand hover:underline">첫 페이지로</Link>} />
            : <PickerEmpty title="아직 저장한 배우가 없어요" description="배우 목록이나 배우 페이지에서 '관심 배우 저장'을 누르면 이곳에 모여요." />
        ) : null}
        {state.status === "ready" && state.list.actorPages.length > 0 ? (
          <ActorBookmarksProvider onChange={load}>
            <ul className={GRID}>{state.list.actorPages.map((actor) => <ActorCard key={actor.publicId} actor={actor} headingLevel={3} />)}</ul>
            <ActorListPagination page={page} totalPages={state.list.totalPages} href={actorBookmarkRoutes.list} label="관심 배우 페이지" />
          </ActorBookmarksProvider>
        ) : null}
      </div>
    </PickerScreen>
  );
}

function BookmarkSummary({ list }: { readonly list: ActorBookmarkList }) {
  const full = list.savedCount >= list.limit;
  return (
    <p className={`mb-6 rounded-control border px-4 py-3 text-sm leading-6 ${full ? "border-warn/30 bg-warn-bg" : "border-border bg-card"}`}>
      <strong className="num font-semibold">저장 {list.savedCount}/{list.limit}명</strong>
      {list.hiddenCount > 0 ? `, 비공개로 바뀐 배우 ${list.hiddenCount}명은 목록에 보이지 않아요.` : ""}
      {full ? " 더 저장하려면 관심 배우를 빼 주세요." : ""}
    </p>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CreatePageButton } from "@/components/auditions/create-form";
import { PickerEmpty, PickerScreen } from "@/components/auditions/picker-card";
import { ScreenError } from "@/components/auditions/screen-status";
import { useToast } from "@/components/auditions/toast";
import { formatShowDateTime } from "@/features/shows/format";
import { getProducerShows } from "@/features/shows/producer-api";
import { SHOW_GENRE_LABELS, showRoutes, type ProducerShowSummary } from "@/features/shows/types";
import { ManagementStatusBadge } from "../show-status";
import { CopyShowLinkButton } from "./copy-show-link-button";
import { ShowFormModal } from "./show-form-modal";

type ListState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly shows: readonly ProducerShowSummary[] };

export function ProducerShowList({ autoOpenCreate = false }: { readonly autoOpenCreate?: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [state, setState] = useState<ListState>({ status: "loading" });
  const [createOpen, setCreateOpen] = useState(autoOpenCreate);

  const load = useCallback(() => {
    let active = true;
    getProducerShows()
      .then((shows) => { if (active) setState({ status: "ready", shows }); })
      .catch((cause) => {
        console.error("[무료 공연 목록 조회 실패]", cause);
        if (active) setState({ status: "error", message: cause instanceof Error ? cause.message : "공연 목록을 불러오지 못했습니다." });
      });
    return () => { active = false; };
  }, []);

  useEffect(() => load(), [load]);

  return (
    <PickerScreen>
      <div className="mx-auto w-full max-w-[1120px]">
        <header className="mb-8 flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-brand">무료 공연 예매</p>
            <h1 className="mt-1 text-2xl font-bold tracking-[-0.025em] md:text-[28px]">무료 공연 관리</h1>
            <p className="mt-2 text-sm text-muted-strong">공연과 회차를 등록하고 공개하면 관객이 로그인 없이 예매할 수 있어요.</p>
          </div>
          <CreatePageButton onClick={() => setCreateOpen(true)}>공연 등록</CreatePageButton>
        </header>

        {state.status === "error" ? <ScreenError message={state.message} onRetry={() => { setState({ status: "loading" }); load(); }} /> : null}
        {state.status === "loading" ? <p role="status" className="rounded-card border border-border bg-card px-5 py-14 text-center text-muted">공연을 불러오는 중…</p> : null}
        {state.status === "ready" && state.shows.length === 0 ? (
          <PickerEmpty title="아직 등록한 무료 공연이 없습니다" description="포스터와 공연 정보를 등록한 뒤 회차를 추가하고 공개해 주세요." />
        ) : null}
        {state.status === "ready" && state.shows.length > 0 ? (
          <section aria-labelledby="producer-show-list-title" className="overflow-hidden rounded-card border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border-soft px-5 py-4">
              <h2 id="producer-show-list-title" className="text-base font-bold">공연 목록</h2>
              <span className="num text-sm text-muted">{state.shows.length}건</span>
            </div>
            <ul className="divide-y divide-border-soft">
              {state.shows.map((show) => <ProducerShowRow key={show.id} show={show} />)}
            </ul>
          </section>
        ) : null}
      </div>
      {createOpen ? (
        <ShowFormModal
          onClose={() => {
            setCreateOpen(false);
            if (autoOpenCreate) router.replace(showRoutes.manageList);
          }}
          onSaved={(show) => {
            setCreateOpen(false);
            toast("공연을 등록했어요. 회차를 추가하고 공개해 주세요.", { type: "success" });
            router.push(showRoutes.manageDetail(show.id));
          }}
        />
      ) : null}
    </PickerScreen>
  );
}

function ProducerShowRow({ show }: { readonly show: ProducerShowSummary }) {
  const href = showRoutes.manageDetail(show.id);
  return (
    <li className="group relative px-5 py-5 transition-colors hover:bg-surface focus-within:bg-surface md:px-6">
      <Link
        href={href}
        aria-label={`${show.title} 회차·예매 관리 열기`}
        className="absolute inset-0 z-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-brand"
      >
        <span className="sr-only">{show.title} 회차·예매 관리 열기</span>
      </Link>
      <div className="pointer-events-none relative z-1">
        <div className="flex gap-4">
          <Image src={show.posterUrl} alt={`${show.title} 포스터`} width={72} height={96} unoptimized className="h-24 w-[72px] shrink-0 rounded-control border border-border object-cover" />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <ManagementStatusBadge status={show.status} />
              <span className="text-xs font-semibold text-brand">{SHOW_GENRE_LABELS[show.genre]}</span>
            </div>
            <h3 className="mt-2 line-clamp-2 text-lg font-bold group-hover:text-brand sm:line-clamp-1">{show.title}</h3>
          </div>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-border-soft pt-4 text-sm sm:grid-cols-3 sm:gap-x-6">
          <div className="col-span-2 min-w-0 sm:col-span-1"><dt className="text-xs text-muted">다음 회차</dt><dd className="num mt-1 font-semibold">{show.nextSessionStartsAt ? formatShowDateTime(show.nextSessionStartsAt) : "없음"}</dd></div>
          <div className="min-w-0"><dt className="text-xs text-muted">회차</dt><dd className="num mt-1 font-semibold">{show.sessionCount}개</dd></div>
          <div className="min-w-0"><dt className="text-xs text-muted">예매</dt><dd className="num mt-1 font-semibold">{show.reservedTickets}매</dd></div>
        </dl>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span aria-hidden="true" className="inline-flex min-h-11 items-center rounded-control border border-brand bg-brand px-3 text-sm font-semibold text-white">회차·예매 관리</span>
          {show.status !== "DRAFT" ? (
            <>
              <Link href={showRoutes.detail(show.id)} target="_blank" className="pointer-events-auto inline-flex min-h-11 items-center rounded-control border border-brand-line px-3 text-sm font-semibold text-brand hover:bg-brand-soft focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">공연 페이지 열기</Link>
              <div className="pointer-events-auto"><CopyShowLinkButton showId={show.id} /></div>
            </>
          ) : null}
        </div>
      </div>
    </li>
  );
}

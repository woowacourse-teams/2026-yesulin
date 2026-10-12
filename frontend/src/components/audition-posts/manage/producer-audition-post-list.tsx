"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { PickerEmpty, PickerScreen } from "@/components/auditions/picker-card";
import { ScreenError } from "@/components/auditions/screen-status";
import { PrimaryLink } from "@/components/ui/controls";
import { formatPostedDate } from "@/features/audition-posts/format";
import { fetchMyAuditionPosts, type ProducerAuditionPost } from "@/features/audition-posts/producer-api";
import { auditionPostRoutes, producerAuditionPostRoutes } from "@/features/audition-posts/types";
import { AuditionPostStatusBadge } from "@/components/audition-posts/audition-post-status-badge";

/** 공개하지 않은 공고가 왜 메인에 없는지 알려 준다. */
const UNPUBLISHED_NOTICE = {
  PENDING: "예술in이 확인한 뒤 공개할 공고예요.",
  HIDDEN: "운영자가 내린 공고예요. 다시 공개하려면 예술in 카카오톡 채널로 문의해 주세요.",
} as const;

type ListState =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly posts: readonly ProducerAuditionPost[] };

/** 기획사가 올렸거나 운영자가 연결해 준 공고 목록. 운영자가 숨긴 공고도 상태와 함께 보여 준다. */
export function ProducerAuditionPostList() {
  const [state, setState] = useState<ListState>({ status: "loading" });

  const load = useCallback(() => {
    let active = true;
    fetchMyAuditionPosts()
      .then((posts) => { if (active) setState({ status: "ready", posts }); })
      .catch((cause) => {
        console.error("[내 공고 목록 조회 실패]", cause);
        if (active) setState({ status: "error", message: cause instanceof Error ? cause.message : "공고 목록을 불러오지 못했습니다." });
      });
    return () => { active = false; };
  }, []);

  useEffect(() => load(), [load]);

  return (
    <PickerScreen>
      <div className="mx-auto w-full max-w-[1120px] break-keep wrap-break-word">
        <header className="mb-8 flex flex-wrap items-start gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-brand">예술in 메인</p>
            <h1 className="mt-1 text-2xl font-bold tracking-[-0.025em] md:text-[28px]">공고 게시</h1>
            <p className="mt-2 text-sm text-muted-strong">공고를 올리면 예술in 메인에 바로 공개돼요. 지원 방법은 본문에 적어 주세요.</p>
          </div>
          <PrimaryLink href={producerAuditionPostRoutes.create} className="whitespace-nowrap">공고 올리기</PrimaryLink>
        </header>

        {state.status === "error" ? <ScreenError message={state.message} onRetry={() => { setState({ status: "loading" }); load(); }} /> : null}
        {state.status === "loading" ? <p role="status" className="rounded-card border border-border bg-card px-5 py-14 text-center text-muted">공고를 불러오는 중…</p> : null}
        {state.status === "ready" && state.posts.length === 0 ? (
          <PickerEmpty title="아직 올린 공고가 없습니다" description="모집 내용과 지원 방법을 적어 올리면 배우들이 예술in 메인에서 바로 볼 수 있어요." />
        ) : null}
        {state.status === "ready" && state.posts.length > 0 ? (
          <section aria-labelledby="producer-post-list-title" className="overflow-hidden rounded-card border border-border bg-card">
            <div className="flex items-center justify-between border-b border-border-soft px-5 py-4">
              <h2 id="producer-post-list-title" className="text-base font-bold">공고 목록</h2>
              <span className="num text-sm text-muted">{state.posts.length}건</span>
            </div>
            <ul className="divide-y divide-border-soft">
              {state.posts.map((post) => <ProducerAuditionPostRow key={post.id} post={post} />)}
            </ul>
          </section>
        ) : null}
      </div>
    </PickerScreen>
  );
}

function ProducerAuditionPostRow({ post }: { readonly post: ProducerAuditionPost }) {
  return (
    <li className="px-5 py-5 md:px-6">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <AuditionPostStatusBadge status={post.status} />
        {post.closed ? <span className="rounded-full bg-border-soft px-2.5 py-0.5 font-bold text-muted">마감</span> : null}
        <span className="text-muted">{post.category}</span>
      </div>
      <h3 className="mt-2 line-clamp-2 text-lg font-bold">
        <Link href={producerAuditionPostRoutes.edit(post.id)} className="hover:text-brand">{post.title}</Link>
      </h3>
      {post.status === "PUBLISHED" ? null : (
        <p className="mt-1 text-sm text-muted-strong">{UNPUBLISHED_NOTICE[post.status]}</p>
      )}
      <dl className="mt-4 grid grid-cols-3 gap-x-4 border-t border-border-soft pt-4 text-sm sm:gap-x-6">
        <div className="min-w-0"><dt className="text-xs text-muted">마감</dt><dd className="mt-1 truncate font-semibold">{post.deadlineText || "미기재"}</dd></div>
        <div className="min-w-0"><dt className="text-xs text-muted">조회</dt><dd className="num mt-1 font-semibold">{post.viewCount}회</dd></div>
        <div className="min-w-0"><dt className="text-xs text-muted">올린 날</dt><dd className="num mt-1 font-semibold">{formatPostedDate(post.createdAt)}</dd></div>
      </dl>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
        <Link href={producerAuditionPostRoutes.edit(post.id)} className="inline-flex min-h-11 items-center justify-center rounded-control border border-brand bg-brand px-4 text-sm font-semibold text-white hover:brightness-95">수정</Link>
        {post.status === "PUBLISHED" ? (
          <Link href={auditionPostRoutes.detail(post.id)} target="_blank" className="inline-flex min-h-11 items-center justify-center rounded-control border border-brand-line px-4 text-sm font-semibold text-brand hover:bg-brand-soft">공고 보기</Link>
        ) : null}
      </div>
    </li>
  );
}

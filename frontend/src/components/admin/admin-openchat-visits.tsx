"use client";

import { useEffect, useState } from "react";
import { AdminApiError, fetchOpenChatVisits } from "@/features/admin/api";
import { adminAuditionPostRoutes } from "@/features/admin/audition-posts";
import type { AdminOpenChatVisits as VisitPage } from "@/features/admin/types";
import { formatDateTime } from "./admin-format";
import { AdminActionButton, AdminEmptyState } from "./admin-shell";

type State =
  | { readonly phase: "loading" }
  | { readonly phase: "failed"; readonly error: string }
  | { readonly phase: "ready"; readonly result: VisitPage };

const STATUS_LABELS = { PENDING: "검토 전", PUBLISHED: "공개 중", HIDDEN: "숨김" } as const;

export function AdminOpenChatVisits({ onUnauthorized }: { readonly onUnauthorized: () => void }) {
  const [state, setState] = useState<State>({ phase: "loading" });
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    fetchOpenChatVisits(page)
      .then((result) => { if (active) setState({ phase: "ready", result }); })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403)) {
          onUnauthorized();
          return;
        }
        setState({ phase: "failed", error: cause instanceof Error ? cause.message : "방문 통계를 불러오지 못했어요." });
      });
    return () => { active = false; };
  }, [page, retry, onUnauthorized]);

  const goToPage = (next: number) => {
    setState({ phase: "loading" });
    setPage(next);
  };

  return (
    <section aria-labelledby="openchat-visits-heading" className="space-y-4">
      <div>
        <h2 id="openchat-visits-heading" className="text-lg font-bold">오픈채팅방 링크 방문</h2>
        <p className="mt-1 text-sm leading-6 text-muted-strong">
          공유용 링크로 공고를 연 브라우저 수예요. 브라우저에 집계 표시가 남아 있으면 같은 공고를 다시 세지 않으며, OTR 원문으로 넘어간 방문도 포함해요.
          관리자 로그인 상태의 방문과 분석을 끈 브라우저는 제외해요.
        </p>
        <p className="mt-1 text-xs leading-5 text-muted">저장값을 지우거나 기기·브라우저를 바꾸면 다시 집계될 수 있어요. 방 참여자의 정확한 인원수와는 다를 수 있어요. 수집을 시작한 뒤의 방문만 표시해요.</p>
      </div>

      {state.phase === "loading" ? <p role="status" className="text-sm text-muted">방문 통계를 불러오는 중이에요.</p> : null}
      {state.phase === "failed" ? (
        <div role="alert" className="rounded-card border border-fail/30 bg-fail-bg p-4 text-sm text-fail">
          <p>{state.error}</p>
          <AdminActionButton className="mt-3" onClick={() => { setState({ phase: "loading" }); setRetry((value) => value + 1); }}>다시 시도</AdminActionButton>
        </div>
      ) : null}
      {state.phase === "ready" ? (
        <>
          {state.result.posts.length === 0 ? <AdminEmptyState title="표시할 공고가 없어요" description="공고가 등록되면 공유용 링크의 방문 수를 여기서 확인할 수 있어요." /> : null}
          <div className="grid gap-3">
            {state.result.posts.map((post) => (
              <article key={post.postId} className="flex flex-col gap-3 rounded-card border border-border bg-card p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                <div className="min-w-0">
                  <p className="text-xs text-muted">{STATUS_LABELS[post.status]} · 게시 {formatDateTime(post.postedAt)}</p>
                  <h3 className="mt-1 break-words font-semibold">
                    <a href={adminAuditionPostRoutes.preview(post.postId)} target="_blank" rel="noopener noreferrer" aria-label={`${post.title} · 미리보기 (새 창)`} className="hover:text-brand hover:underline">{post.title}</a>
                  </h3>
                </div>
                <p className="shrink-0 text-sm text-muted-strong">
                  링크 방문 <span className="num ml-1 text-2xl font-bold text-foreground">{post.visitCount.toLocaleString("ko-KR")}</span>명
                </p>
              </article>
            ))}
          </div>
          {state.result.totalPages > 1 ? (
            <nav aria-label="오픈채팅방 링크 방문 통계 페이지" className="flex flex-wrap items-center justify-between gap-3">
              <p className="num text-sm text-muted">전체 {state.result.totalElements.toLocaleString("ko-KR")}개 공고</p>
              <div className="flex items-center gap-3">
                <AdminActionButton disabled={page === 0} onClick={() => goToPage(page - 1)}>이전</AdminActionButton>
                <span className="num text-sm" aria-live="polite">{page + 1} / {state.result.totalPages}</span>
                <AdminActionButton disabled={page + 1 >= state.result.totalPages} onClick={() => goToPage(page + 1)}>다음</AdminActionButton>
              </div>
            </nav>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

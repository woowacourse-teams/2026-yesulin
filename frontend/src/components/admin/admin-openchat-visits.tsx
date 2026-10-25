"use client";

import { useEffect, useState } from "react";
import { AdminApiError, fetchOpenChatVisits } from "@/features/admin/api";
import { adminAuditionPostRoutes } from "@/features/admin/audition-posts";
import { koreaToday, moveOpenChatPeriod, openChatPostedRange, type OpenChatPeriod } from "@/features/admin/openchat-period";
import type { AdminOpenChatVisits as VisitPage } from "@/features/admin/types";
import { SiteIcon } from "@/components/ui/site-icon";
import { formatDateTime } from "./admin-format";
import { AdminOpenChatVisitChart } from "./admin-openchat-visit-chart";
import { AdminActionButton, AdminEmptyState, AdminFilterButton } from "./admin-shell";

type State =
  | { readonly phase: "loading" }
  | { readonly phase: "failed"; readonly error: string }
  | { readonly phase: "ready"; readonly result: VisitPage; readonly topPosts: VisitPage["posts"] };

const STATUS_LABELS = { PENDING: "검토 전", PUBLISHED: "공개 중", HIDDEN: "숨김" } as const;
const PERIODS: readonly { readonly value: OpenChatPeriod; readonly label: string; readonly current: string }[] = [
  { value: "DAY", label: "일간", current: "오늘" },
  { value: "WEEK", label: "주간", current: "이번 주" },
  { value: "MONTH", label: "월간", current: "이번 달" },
  { value: "ALL", label: "전체", current: "전체" },
];

export function AdminOpenChatVisits({ onUnauthorized }: { readonly onUnauthorized: () => void }) {
  const [state, setState] = useState<State>({ phase: "loading" });
  const [page, setPage] = useState(0);
  const [retry, setRetry] = useState(0);
  const [period, setPeriod] = useState<OpenChatPeriod>("WEEK");
  const [anchor, setAnchor] = useState(() => koreaToday());
  const [guideOpen, setGuideOpen] = useState(false);
  const range = openChatPostedRange(period, anchor);
  const startDate = range?.startDate;
  const endDate = range?.endDate;

  useEffect(() => {
    let active = true;
    const postedRange = startDate && endDate ? { startDate, endDate } : null;
    const currentPage = fetchOpenChatVisits(page, postedRange);
    const firstPage = page === 0 ? currentPage : fetchOpenChatVisits(0, postedRange);
    Promise.all([currentPage, firstPage])
      .then(([result, first]) => { if (active) setState({ phase: "ready", result, topPosts: first.posts.slice(0, 5) }); })
      .catch((cause: unknown) => {
        if (!active) return;
        if (cause instanceof AdminApiError && (cause.status === 401 || cause.status === 403)) {
          onUnauthorized();
          return;
        }
        setState({ phase: "failed", error: cause instanceof Error ? cause.message : "방문 통계를 불러오지 못했어요." });
      });
    return () => { active = false; };
  }, [page, retry, startDate, endDate, onUnauthorized]);

  const changePeriod = (next: OpenChatPeriod, date = anchor) => {
    setState({ phase: "loading" });
    setPage(0);
    setPeriod(next);
    setAnchor(date);
    setRetry((value) => value + 1);
  };

  const goToPage = (next: number) => {
    setState({ phase: "loading" });
    setPage(next);
  };

  return (
    <section aria-labelledby="openchat-visits-heading" className="space-y-4">
      <div>
        <div className="flex items-center">
          <h2 id="openchat-visits-heading" className="text-lg font-bold">오픈채팅방 링크 방문</h2>
          <button type="button" aria-label="링크 방문 집계 안내" aria-expanded={guideOpen} aria-controls="openchat-visits-guide" onClick={() => setGuideOpen((open) => !open)} className={`inline-flex size-11 shrink-0 items-center justify-start rounded-control pl-1 transition-colors hover:bg-brand-soft hover:text-brand ${guideOpen ? "bg-brand-soft text-brand" : "text-muted"}`}>
            <SiteIcon name="about" size={18} />
          </button>
        </div>
        <div id="openchat-visits-guide" hidden={!guideOpen} className="mt-2 space-y-2 rounded-control border border-border bg-card p-4">
          <p className="text-sm leading-6 text-muted-strong">
            공유용 링크로 공고를 연 브라우저 수예요. 브라우저에 집계 표시가 남아 있으면 같은 공고를 다시 세지 않으며, OTR 원문으로 넘어간 방문도 포함해요.
            관리자 로그인 상태의 방문과 분석을 끈 브라우저는 제외해요.
          </p>
          <p className="text-xs leading-5 text-muted">저장값을 지우거나 기기·브라우저를 바꾸면 다시 집계될 수 있어요. 방 참여자의 정확한 인원수와는 다를 수 있어요. 수집을 시작한 뒤의 방문만 표시해요.</p>
          <p className="text-xs leading-5 text-muted-strong">선택한 기간에 게시된 공고의 누적 링크 방문 수를 비교해요. 기간이 지난 뒤의 방문도 계속 합산돼요. 주간은 월~일이며, 게시일이 없는 공고는 전체에서만 보여요.</p>
        </div>
      </div>

      <div className="space-y-4 rounded-card border border-border bg-card p-4 sm:p-5">
        <div className="flex flex-wrap gap-2" role="group" aria-label="공고 게시일 기간">
          {PERIODS.map((item) => (
            <AdminFilterButton key={item.value} pressed={period === item.value} onClick={() => changePeriod(item.value)}>{item.label}</AdminFilterButton>
          ))}
        </div>
        {period !== "ALL" ? (
          <div className="flex flex-wrap items-end gap-3">
            <label className="min-w-0 text-sm font-medium">
              기준 날짜
              <input type="date" value={anchor} min="1900-01-01" max="9998-12-31" className="mt-1 block min-h-11 max-w-full rounded-control border border-border bg-background px-3 py-2 font-normal" onChange={(event) => {
                const date = event.target.value;
                if (date && date >= "1900-01-01" && date <= "9998-12-31") changePeriod(period, date);
              }} />
            </label>
            <div className="flex flex-wrap gap-2">
              <AdminActionButton disabled={anchor <= "1900-02-01"} onClick={() => changePeriod(period, moveOpenChatPeriod(period, anchor, -1))}>이전 기간</AdminActionButton>
              <AdminActionButton disabled={anchor >= "9998-11-01"} onClick={() => changePeriod(period, moveOpenChatPeriod(period, anchor, 1))}>다음 기간</AdminActionButton>
              <AdminActionButton onClick={() => changePeriod(period, koreaToday())}>{PERIODS.find((item) => item.value === period)?.current}</AdminActionButton>
            </div>
          </div>
        ) : null}
        <div>
          <p className="num text-sm font-semibold">게시일 기준 · {range ? range.startDate === range.endDate ? range.startDate : `${range.startDate} ~ ${range.endDate}` : "전체 기간"} <span className="font-normal text-muted">(한국 시간)</span></p>
        </div>
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
          <div className="grid grid-cols-2 gap-3" aria-label="선택 기간 요약">
            <div className="rounded-card border border-border bg-card p-4"><p className="text-sm text-muted-strong">게시 공고</p><p className="num mt-1 text-2xl font-bold">{state.result.totalElements.toLocaleString("ko-KR")}<span className="ml-1 text-sm font-normal">개</span></p></div>
            <div className="rounded-card border border-border bg-card p-4"><p className="text-sm text-muted-strong">누적 링크 방문</p><p className="num mt-1 text-2xl font-bold">{state.result.totalVisits.toLocaleString("ko-KR")}<span className="ml-1 text-sm font-normal">회</span></p></div>
          </div>
          {state.result.totalElements > 0 ? <AdminOpenChatVisitChart posts={state.topPosts} /> : null}
          {state.result.posts.length === 0 ? <AdminEmptyState title="해당 기간에 게시된 공고가 없어요" description="다른 기간을 선택하거나 전체 공고를 확인해 주세요." /> : null}
          <div className="grid gap-3 min-[540px]:grid-cols-2 xl:grid-cols-3">
            {state.result.posts.map((post, index) => (
              <article key={post.postId} className="flex min-w-0 flex-col gap-4 rounded-card border border-border bg-card p-4 sm:p-5">
                <div className="min-w-0">
                  <p className="text-xs text-muted"><span className="num font-bold text-foreground">{page * state.result.size + index + 1}위</span> · {STATUS_LABELS[post.status]}</p>
                  <h3 className="mt-2 break-words font-semibold leading-6">
                    <a href={adminAuditionPostRoutes.preview(post.postId)} target="_blank" rel="noopener noreferrer" aria-label={`${post.title} · 미리보기 (새 창)`} className="hover:text-brand hover:underline">{post.title}</a>
                  </h3>
                  <p className="mt-2 text-xs text-muted">게시 {formatDateTime(post.postedAt)}</p>
                </div>
                <p className="mt-auto flex items-baseline justify-between gap-2 border-t border-border-soft pt-3 text-sm text-muted-strong">
                  <span>누적 링크 방문</span><span><span className="num text-2xl font-bold text-foreground">{post.visitCount.toLocaleString("ko-KR")}</span>회</span>
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

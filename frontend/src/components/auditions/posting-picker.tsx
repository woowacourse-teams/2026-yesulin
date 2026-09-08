"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useRef, useState } from "react";
import { Breadcrumb } from "./breadcrumb";
import { CreatePageButton } from "./create-form";
import { HorizontalScrollArea } from "./horizontal-scroll-area";
import { PickerEmpty, PickerScreen } from "./picker-card";
import { PostingCreateModal } from "./posting-create-modal";
import { PostingManageDialog } from "./posting-manage-dialog";
import { PickerSkeleton, ScreenError } from "./screen-status";
import { PhaseTag } from "./status-badge";
import { useToast } from "./toast";
import { getPostings } from "@/features/auditions/api";
import { PHASE_LABELS } from "@/features/auditions/labels";
import { auditionRoutes, postingEntryHref, publicApplicationRoute } from "@/features/auditions/routes";
import {
  POSTING_PHASES,
  type PerformanceId,
  type PostingPhaseCounts,
  type PostingPhase,
  type PostingSummary,
} from "@/features/auditions/types";
import { useAuditionQuery } from "@/features/auditions/use-audition-query";
import { FieldInput, FilterChip } from "@/components/ui/controls";
import { ApplicationLinkButton } from "./application-link-button";

type PostingFilter = "ALL" | PostingPhase;

const FILTERS: readonly PostingFilter[] = ["ALL", ...POSTING_PHASES];

function postingCount(counts: PostingPhaseCounts, filter: PostingFilter) {
  if (filter === "ALL") return counts.all;
  if (filter === "DRAFT") return counts.draft;
  if (filter === "UPCOMING") return counts.upcoming;
  if (filter === "OPEN") return counts.open;
  if (filter === "RECRUIT_CLOSED") return counts.recruitClosed;
  return counts.finished;
}

function reviewState(posting: PostingSummary) {
  if (posting.allRoundsClosed) return "전형 종료";
  if (posting.applicantCount === 0) return "지원 대기";
  if (posting.pendingReviewCount > 0) return `검토 대기 ${posting.pendingReviewCount}건`;
  return "검토 완료";
}

export function PostingPicker({ performanceId, autoOpenCreate = false }: { readonly performanceId: PerformanceId; readonly autoOpenCreate?: boolean }) {
  const [createOpen, setCreateOpen] = useState(autoOpenCreate);
  const [filter, setFilter] = useState<PostingFilter>("ALL");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [manage, setManage] = useState<{ readonly posting: PostingSummary; readonly mode: "EDIT" | "DELETE" } | null>(null);
  const load = useCallback(() => getPostings(performanceId, {
    keyword: deferredQuery,
    phase: filter === "ALL" ? undefined : filter,
  }), [deferredQuery, filter, performanceId]);
  const requestKey = `${performanceId}:${filter}:${deferredQuery.trim()}`;
  const { data, error, loading, reload } = useAuditionQuery(requestKey, load, "공고를 불러오지 못했습니다.");

  return <>
    <Breadcrumb items={[{ label: "전체 공연", href: auditionRoutes.performances }, { label: data?.performance.title ?? "공연" }]} />
    {loading ? <PickerSkeleton /> : null}
    {error ? <div className="p-4 md:p-6"><ScreenError message={error} onRetry={reload} /></div> : null}
    {data ? <PickerScreen><div className="mx-auto w-full max-w-[1120px]">
      <header className="mb-8 flex flex-wrap items-center gap-5">
        <Image src={data.performance.posterUrl} alt={`${data.performance.title} 포스터`} width={56} height={72} unoptimized className="h-[72px] w-14 rounded-lg object-cover" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-brand">공고 관리</p>
          <h1 className="mt-1 truncate text-2xl font-bold tracking-[-0.025em] md:text-[28px]">{data.performance.title}</h1>
          <p className="num mt-1 text-sm text-muted">등록된 공고 {data.counts.all}건</p>
        </div>
        <CreatePageButton onClick={() => setCreateOpen(true)}>공고 추가</CreatePageButton>
      </header>

      {data.counts.all > 0 ? <>
        <section aria-label="공고 검색 및 상태 필터" className="mb-4 rounded-card border border-border bg-card p-4 md:p-5">
          <div className="relative max-w-md">
            <svg aria-hidden="true" viewBox="0 0 20 20" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 fill-none stroke-muted stroke-[1.8]"><circle cx="8.5" cy="8.5" r="5.25" /><path d="m12.5 12.5 4 4" /></svg>
            <FieldInput type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="공고명 검색" aria-label="공고명 검색" className="pl-10" />
          </div>
          <HorizontalScrollArea className="mt-4" scrollerClassName="pr-8">
            <div className="flex min-w-max gap-2 pb-1" aria-label="공고 상태">
              {FILTERS.map((value) => {
                const count = postingCount(data.counts, value);
                const label = value === "ALL" ? "전체" : PHASE_LABELS[value];
                return <FilterChip key={value} pressed={filter === value} onClick={() => setFilter(value)}>{label} <span className="num ml-1 opacity-70">{count}</span></FilterChip>;
              })}
            </div>
          </HorizontalScrollArea>
        </section>

        <section aria-labelledby="posting-list-title" className="rounded-card border border-border bg-card">
          <div className="flex items-center justify-between rounded-t-card border-b border-border-soft px-5 py-4">
            <h2 id="posting-list-title" className="text-base font-bold">공고 목록</h2>
            <span className="num text-sm text-muted">{data.postings.length}건</span>
          </div>
          {data.postings.length > 0 ? <ul className="divide-y divide-border-soft">
            {data.postings.map((posting) => <PostingRow key={posting.id} posting={posting} onEdit={() => setManage({ posting, mode: "EDIT" })} onDelete={() => setManage({ posting, mode: "DELETE" })} />)}
          </ul> : <div className="px-5 py-14 text-center"><strong className="block text-base">조건에 맞는 공고가 없습니다</strong><p className="mt-2 text-sm text-muted">검색어나 상태 필터를 변경해 주세요.</p></div>}
        </section>
      </> : <PickerEmpty title="아직 등록된 공고가 없습니다" description="모집 기간과 배역, 전형 일정을 설정해 첫 모집을 시작하세요." />}
    </div></PickerScreen> : null}
    {createOpen && data ? <PostingCreateModal performanceId={performanceId} performanceTitle={data.performance.title} performancePosterUrl={data.performance.posterUrl} performanceStart={data.performance.performanceStart ?? ""} performanceEnd={data.performance.performanceEnd ?? ""} roleTemplates={data.roleTemplates} onClose={() => setCreateOpen(false)} onCreated={reload} /> : null}
    {manage ? <PostingManageDialog posting={manage.posting} mode={manage.mode} onClose={() => setManage(null)} onChanged={reload} /> : null}
  </>;
}

function PostingRow({ posting, onEdit, onDelete }: { readonly posting: PostingSummary; readonly onEdit: () => void; readonly onDelete: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const unavailable = posting.phase === "DRAFT" || posting.phase === "UPCOMING";
  const destination = unavailable ? auditionRoutes.posting(posting.id) : postingEntryHref(posting);
  return <li className={`group relative px-4 py-5 transition-colors last:rounded-b-card hover:bg-surface focus-within:bg-surface md:px-6 md:py-6 ${menuOpen ? "z-20" : "z-0"}`}>
    <Link href={destination} aria-label={`${posting.title} ${unavailable ? "공고 관리" : "지원자 관리"} 열기`} className="absolute inset-0 z-0 rounded-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-brand"><span className="sr-only">{posting.title} 열기</span></Link>
    <div className={`pointer-events-none relative ${menuOpen ? "z-10" : "z-1"}`}>
      <div className="min-w-0">
        <PhaseTag phase={posting.phase} />
        <div className="mt-2 flex items-center gap-3">
          <h3 className="min-w-0 flex-1 line-clamp-2 text-lg font-bold transition-colors group-hover:text-brand sm:line-clamp-1">{posting.title}</h3>
          {posting.phase !== "DRAFT" ? <div className="pointer-events-auto hidden shrink-0 sm:block"><ApplicationLinkButton postingId={posting.id} compact /></div> : null}
          <div className="pointer-events-auto shrink-0"><PostingMoreMenu posting={posting} open={menuOpen} onOpenChange={setMenuOpen} onEdit={onEdit} onDelete={onDelete} /></div>
        </div>
      </div>
    </div>
    <dl className="pointer-events-none relative z-1 mt-5 grid grid-cols-2 gap-y-5 border-t border-border-soft pt-5 sm:grid-cols-3 sm:divide-x sm:divide-border-soft">
      <PostingMetric label="모집 마감" value={posting.deadline} numeric />
      <PostingMetric label="모집 배역" value={`${posting.roleCount}개`} numeric />
      <PostingMetric label="검토 상태" value={reviewState(posting)} progress={posting.allRoundsClosed || posting.applicantCount === 0 ? undefined : posting.progress.percent} />
    </dl>
  </li>;
}

function PostingMetric({ label, value, numeric = false, progress }: { readonly label: string; readonly value: string; readonly numeric?: boolean; readonly progress?: number }) {
  return <div className="min-w-0 sm:px-4 first:pl-0 last:pr-0"><dt className="text-xs font-medium text-muted">{label}</dt><dd className={`${numeric ? "num" : ""} mt-1 truncate text-sm font-semibold text-foreground`}>{value}</dd>{progress !== undefined ? <div className="mt-2 flex max-w-40 items-center gap-2"><span role="progressbar" aria-label="심사 검토 진행률" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} className="h-1 flex-1 overflow-hidden rounded-full bg-border-soft"><i className="block h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${progress}%` }} /></span><span className="num text-xs text-muted">{progress}%</span></div> : null}</div>;
}

function PostingMoreMenu({ posting, open, onOpenChange, onEdit, onDelete }: { readonly posting: PostingSummary; readonly open: boolean; readonly onOpenChange: (open: boolean) => void; readonly onEdit: () => void; readonly onDelete: () => void }) {
  const [copying, setCopying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) onOpenChange(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open, onOpenChange]);

  async function copyLink() {
    setCopying(true);
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${publicApplicationRoute(posting.id)}`);
      toast("지원 링크를 복사했습니다.", { type: "success" });
      onOpenChange(false);
    } catch (cause) {
      console.error("[지원 링크 복사 실패]", cause);
      toast("지원 링크를 복사하지 못했습니다. 다시 시도해 주세요.", { type: "error" });
    } finally {
      setCopying(false);
    }
  }

  return <div ref={containerRef} className="relative">
    <button type="button" aria-label={`${posting.title} 더보기`} aria-haspopup="menu" aria-expanded={open} onClick={() => onOpenChange(!open)} className="grid h-11 w-11 place-items-center rounded-control border border-border bg-card text-muted-strong transition-colors hover:border-brand-line hover:bg-brand-soft hover:text-brand"><svg aria-hidden="true" viewBox="0 0 20 20" className="h-5 w-5 fill-current"><circle cx="4" cy="10" r="1.4" /><circle cx="10" cy="10" r="1.4" /><circle cx="16" cy="10" r="1.4" /></svg></button>
    {open ? <div role="menu" className="absolute right-0 top-[calc(100%+8px)] z-20 w-44 rounded-card border border-border bg-card p-2 shadow-[var(--shadow-2)]">
      {posting.phase === "DRAFT" ? <span role="menuitem" aria-disabled="true" className="flex min-h-10 w-full items-center rounded-control px-3 text-sm font-semibold text-muted">공고 미게시</span> : <Link href={publicApplicationRoute(posting.id)} role="menuitem" onClick={() => onOpenChange(false)} className="flex min-h-10 w-full items-center rounded-control px-3 text-sm font-semibold text-muted-strong hover:bg-surface hover:text-foreground">공고 보기</Link>}
      <button type="button" role="menuitem" disabled={copying} onClick={copyLink} className="flex min-h-10 w-full items-center rounded-control px-3 text-left text-sm font-semibold text-muted-strong hover:bg-surface hover:text-foreground disabled:text-muted sm:hidden">{copying ? "복사 중…" : "지원 링크 복사"}</button>
      <button type="button" role="menuitem" onClick={() => { onOpenChange(false); onEdit(); }} className="flex min-h-10 w-full items-center rounded-control px-3 text-left text-sm font-semibold text-muted-strong hover:bg-surface hover:text-foreground">공고 수정</button>
      <div className="my-1 border-t border-border-soft" />
      <button type="button" role="menuitem" onClick={() => { onOpenChange(false); onDelete(); }} className="flex min-h-10 w-full items-center rounded-control px-3 text-left text-sm font-semibold text-fail hover:bg-fail-bg">삭제</button>
    </div> : null}
  </div>;
}

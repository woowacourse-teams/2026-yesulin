"use client";

import Image from "next/image";
import Link from "next/link";
import { useDeferredValue, useEffect, useState } from "react";
import { getPerformances, updatePerformanceVisibility } from "@/features/performance/api";
import type {
  PerformanceCategory,
  PerformanceSummary,
  PerformanceVisibility,
} from "@/features/performance/types";

const categoryLabels: Record<PerformanceCategory, string> = {
  PLAY: "연극",
  MUSICAL: "뮤지컬",
};

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "long",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function PerformanceList() {
  const [performances, setPerformances] = useState<PerformanceSummary[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<PerformanceCategory | "ALL">("ALL");
  const [recruiting, setRecruiting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let active = true;

    getPerformances({ query: deferredQuery, category, recruiting })
      .then((response) => {
        if (active) {
          setPerformances(response.performances);
          setTotalCount(response.totalCount);
          setError("");
        }
      })
      .catch((requestError: unknown) => {
        if (active) {
          setError(requestError instanceof Error ? requestError.message : "공연을 불러오지 못했습니다.");
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [category, deferredQuery, recruiting]);

  function handleVisibilityChange(
    performanceId: string,
    visibility: PerformanceVisibility,
  ) {
    setPerformances((current) =>
      current.map((performance) =>
        performance.id === performanceId ? { ...performance, visibility } : performance,
      ),
    );

    updatePerformanceVisibility(performanceId, visibility).catch((requestError: unknown) => {
      setPerformances((current) =>
        current.map((performance) =>
          performance.id === performanceId
            ? {
                ...performance,
                visibility: visibility === "DISPLAYED" ? "HIDDEN" : "DISPLAYED",
              }
            : performance,
        ),
      );
      setError(requestError instanceof Error ? requestError.message : "전시 상태를 변경하지 못했습니다.");
    });
  }

  return (
    <div className="space-y-6">
      <PageHeading />
      <PerformanceFilters
        query={query}
        category={category}
        recruiting={recruiting}
        onQueryChange={setQuery}
        onCategoryChange={setCategory}
        onRecruitingChange={setRecruiting}
      />

      {error ? (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-danger">
          {error}
        </div>
      ) : null}

      <div className="flex items-center justify-between">
        <p className="text-sm text-muted">
          {loading
            ? "공연을 불러오는 중입니다."
            : performances.length === totalCount
              ? `전체 공연 ${totalCount}개`
              : `조회 결과 ${performances.length}개 · 전체 공연 ${totalCount}개`}
        </p>
        <p className="hidden text-xs text-muted sm:block">최근 수정한 공연부터 표시됩니다.</p>
      </div>

      {loading ? (
        <PerformanceGridSkeleton />
      ) : performances.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {performances.map((performance, index) => (
            <PerformanceCard
              key={performance.id}
              performance={performance}
              imageLoading={index === 0 ? "eager" : "lazy"}
              onVisibilityChange={handleVisibilityChange}
            />
          ))}
        </div>
      ) : (
        <EmptyPerformanceList />
      )}
    </div>
  );
}

function PageHeading() {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">Productions</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">공연 관리</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">
          공고를 만들기 전에 공연과 모집 배역을 먼저 등록해주세요. 하나의 공연에서 여러 차수의
          공고를 이어서 관리할 수 있습니다.
        </p>
      </div>
      <Link
        href="/producers/performances/new"
        className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white shadow hover:bg-primary/90"
      >
        <PlusIcon /> 공연 등록
      </Link>
    </header>
  );
}

function PerformanceFilters({
  query,
  category,
  recruiting,
  onQueryChange,
  onCategoryChange,
  onRecruitingChange,
}: {
  query: string;
  category: PerformanceCategory | "ALL";
  recruiting: boolean;
  onQueryChange: (query: string) => void;
  onCategoryChange: (category: PerformanceCategory | "ALL") => void;
  onRecruitingChange: (recruiting: boolean) => void;
}) {
  return (
    <section aria-label="공연 필터" className="grid gap-3 rounded-2xl border border-border bg-card p-3 shadow-elev-1 sm:grid-cols-[minmax(240px,1fr)_180px_auto]">
      <label className="relative">
        <span className="sr-only">공연 제목 검색</span>
        <SearchIcon />
        <input
          type="search"
          name="performanceQuery"
          autoComplete="off"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="공연 제목 검색"
          className="h-10 w-full rounded-xl border border-border-strong bg-background pl-11 pr-4 text-sm outline-none transition focus:border-foreground"
        />
      </label>

      <label>
        <span className="sr-only">카테고리</span>
        <select
          name="performanceCategory"
          value={category}
          onChange={(event) => onCategoryChange(event.target.value as PerformanceCategory | "ALL")}
          className="h-10 w-full rounded-xl border border-border-strong bg-background px-4 text-sm outline-none focus:border-foreground"
        >
          <option value="ALL">전체 카테고리</option>
          <option value="PLAY">연극</option>
          <option value="MUSICAL">뮤지컬</option>
        </select>
      </label>

      <label className="flex h-10 cursor-pointer items-center gap-2.5 rounded-xl border border-border-strong px-4 text-sm">
        <input
          type="checkbox"
          name="recruitingOnly"
          checked={recruiting}
          onChange={(event) => onRecruitingChange(event.target.checked)}
          className="h-4 w-4 accent-[#171717]"
        />
        모집 중만 보기
      </label>
    </section>
  );
}

function PerformanceCard({
  performance,
  imageLoading,
  onVisibilityChange,
}: {
  performance: PerformanceSummary;
  imageLoading: "eager" | "lazy";
  onVisibilityChange: (performanceId: string, visibility: PerformanceVisibility) => void;
}) {
  const displayed = performance.visibility === "DISPLAYED";
  const nextVisibility: PerformanceVisibility = displayed ? "HIDDEN" : "DISPLAYED";

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-elev-1">
      <div className="grid grid-cols-[112px_minmax(0,1fr)]">
        <div className="relative min-h-40 overflow-hidden bg-surface">
          <Image
            src={performance.thumbnailUrl}
            alt={`${performance.title} 썸네일`}
            fill
            sizes="112px"
            className="object-cover"
            loading={imageLoading}
            unoptimized={performance.thumbnailUrl.startsWith("data:")}
          />
        </div>
        <div className="flex min-w-0 flex-col p-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted">
              {categoryLabels[performance.category]}
            </span>
            <span className={`text-xs font-semibold ${displayed ? "text-success" : "text-muted"}`}>
              {displayed ? "전시 중" : "미전시"}
            </span>
          </div>
          <h2 className="mt-1 line-clamp-2 text-lg font-semibold tracking-tight">
            {performance.title}
          </h2>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted">{performance.description}</p>
          <div className="mt-auto flex flex-wrap gap-2 pt-3 text-xs">
            <span className="rounded-full bg-secondary px-2.5 py-1 font-semibold">
              공고 {performance.statistics.totalRecruitmentCount}건
            </span>
            <span className="rounded-full bg-green-50 px-2.5 py-1 font-semibold text-success">
              모집 중 {performance.statistics.openRecruitmentCount}건
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-border p-4">
        <div className="flex items-center justify-between gap-3 text-xs">
          <span className="text-muted">누적 지원자</span>
          <strong>{performance.statistics.totalApplicantCount}명</strong>
        </div>
        <div className="mt-2 flex items-center justify-between gap-3 text-xs">
          <span className="text-muted">등록 배역</span>
          <strong>{performance.roleCount}개</strong>
        </div>
        <LatestRecruitmentSummary performance={performance} />
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Link
            href={`/producers/performances/${performance.id}/edit`}
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border-strong bg-background text-sm font-semibold hover:bg-secondary"
          >
            공연 수정
          </Link>
          <button
            type="button"
            role="switch"
            aria-checked={displayed}
            onClick={() => onVisibilityChange(performance.id, nextVisibility)}
            className={`min-h-10 rounded-xl text-sm font-semibold transition ${
              displayed
                ? "bg-secondary text-foreground hover:bg-sidebar-accent"
                : "bg-primary text-white hover:bg-primary/90"
            }`}
          >
            {displayed ? "미전시로 변경" : "공연 전시"}
          </button>
        </div>
      </div>
    </article>
  );
}

function LatestRecruitmentSummary({ performance }: { performance: PerformanceSummary }) {
  if (!performance.latestRecruitment) {
    return (
      <div className="mt-3 rounded-xl bg-surface p-3">
        <p className="text-xs font-semibold text-muted">아직 등록된 공고가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="mt-3 rounded-xl bg-surface p-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">최근 공고</p>
        <span className="text-[11px] text-muted">
          {dateFormatter.format(new Date(performance.latestRecruitment.closesAt))} 마감
        </span>
      </div>
      <p className="mt-1 truncate text-sm font-semibold">{performance.latestRecruitment.title}</p>
    </div>
  );
}

function PerformanceGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3" aria-hidden="true">
      {[0, 1, 2].map((item) => (
        <div key={item} className="h-[390px] animate-pulse rounded-2xl border border-border bg-white">
          <div className="h-40 bg-surface" />
          <div className="space-y-3 p-4">
            <div className="h-4 w-1/3 rounded bg-surface" />
            <div className="h-6 w-2/3 rounded bg-surface" />
            <div className="h-20 rounded bg-surface" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyPerformanceList() {
  return (
    <div className="rounded-2xl border border-dashed border-border-strong bg-white px-6 py-16 text-center">
      <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-accent text-xl">＋</div>
      <h2 className="mt-4 text-lg font-semibold">조건에 맞는 공연이 없습니다.</h2>
      <p className="mt-2 text-sm text-muted">검색 조건을 바꾸거나 새로운 공연을 등록해주세요.</p>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none">
      <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 20 20" className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" fill="none">
      <circle cx="9" cy="9" r="5.5" stroke="currentColor" strokeWidth="1.7" />
      <path d="m13 13 3 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

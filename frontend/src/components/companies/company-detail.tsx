"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PublicVenueGuide } from "@/components/applications/public-venue-guide";
import { AuditionPostCard } from "@/components/audition-posts/audition-post-card";
import { AuditionPostScreen } from "@/components/audition-posts/audition-post-screen";
import { kstToday } from "@/features/audition-posts/format";
import { auditionPostRoutes, type AuditionPostSummary } from "@/features/audition-posts/types";
import { viewCountClock } from "@/features/audition-posts/view-count";
import { getCompany, getCompanyPosts } from "@/features/companies/api";
import { SecondaryLink } from "@/components/ui/controls";
import { COMPANY_CORRECTION_URL, companyRoutes, type Company } from "@/features/companies/types";
import { CompanyAvatar } from "./company-avatar";
import { CompanyFacts, Undisclosed } from "./company-summary-card";

type CompanyState =
  | { readonly status: "loading" }
  | { readonly status: "missing" }
  | { readonly status: "ready"; readonly company: Company; readonly posts: readonly AuditionPostSummary[] };

/** 공연사 화면은 서버가 미리 읽은 정보를 쓰고, 목 환경·서버 API 미설정 시 브라우저에서 읽는다. */
export function CompanyRoute({ companyId, initial }: {
  readonly companyId: string;
  readonly initial: { readonly company: Company; readonly posts: readonly AuditionPostSummary[] } | null;
}) {
  const [state, setState] = useState<CompanyState>(
    initial ? { status: "ready", ...initial } : { status: "loading" },
  );

  useEffect(() => {
    if (initial) return;
    let active = true;
    Promise.all([getCompany(companyId), getCompanyPosts(companyId)])
      .then(([company, posts]) => { if (active) setState({ status: "ready", company, posts }); })
      .catch((cause) => {
        console.error("[공연사 조회 실패]", cause);
        if (active) setState({ status: "missing" });
      });
    return () => { active = false; };
  }, [companyId, initial]);

  return (
    <AuditionPostScreen>
      {state.status === "loading" ? <CompanySkeleton /> : null}
      {state.status === "missing" ? <MissingCompany /> : null}
      {state.status === "ready" ? <CompanyDetail company={state.company} posts={state.posts} /> : null}
    </AuditionPostScreen>
  );
}

function CompanyDetail({ company, posts }: {
  readonly company: Company;
  readonly posts: readonly AuditionPostSummary[];
}) {
  const [today] = useState(() => kstToday());
  const [now] = useState(() => viewCountClock());

  return (
    <div className="mt-3 space-y-4">
      <article className="overflow-hidden rounded-card border border-border bg-card">
        <header className="border-b border-border-soft px-5 py-6 sm:px-8 sm:py-8">
          <div className="flex min-w-0 items-center gap-4">
            <CompanyAvatar name={company.name} photoUrl={company.photoUrl} size="lg" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-brand">공연사</p>
              <h1 className="mt-1 break-words text-[clamp(24px,3.4vw,32px)] font-bold leading-snug tracking-[-0.03em]">{company.name}</h1>
            </div>
          </div>
          <CompanyFacts company={company} className="mt-5" />
          <p className="mt-2 flex gap-3 text-sm">
            <span className="w-16 shrink-0 text-muted">연락처</span>
            {company.phone
              ? <a href={`tel:${company.phone.replace(/[^0-9+]/g, "")}`} className="num font-medium hover:text-brand">{company.phone}</a>
              : <Undisclosed />}
          </p>
        </header>
        <div className="divide-y divide-border-soft">
          <TextSection id="company-description" title="소개" text={company.description} />
          <TextSection id="company-history" title="연혁" text={company.history} />
        </div>
      </article>

      {company.address ? (
        <PublicVenueGuide
          venue={company.name}
          address={company.address}
          label="공연사 위치"
          actionLabel="공연사"
          note="공연사가 알려 준 사무실·연습실 주소입니다. 공연이 열리는 장소와 다를 수 있어요."
        />
      ) : null}

      <section aria-labelledby="company-posts" className="rounded-card border border-border bg-card px-5 py-6 sm:px-8">
        <h2 id="company-posts" className="text-base font-bold">
          이 공연사의 공고 <span className="num text-muted">{posts.length}</span>
        </h2>
        {posts.length ? (
          <ul className="mt-4 grid gap-3">
            {posts.map((post) => <AuditionPostCard key={post.id} post={post} today={today} now={now} />)}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted-strong">지금 공개된 공고가 없어요.</p>
        )}
      </section>

      <section aria-labelledby="company-correction" className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-dashed border-border bg-card px-5 py-5 sm:px-8">
        <div className="min-w-0">
          <h2 id="company-correction" className="text-sm font-bold">정보가 틀렸거나 빠졌나요?</h2>
          <p className="mt-1 text-xs leading-5 text-muted">
            공개된 자료와 공연사가 알려 준 내용을 운영자가 확인해 정리했어요. 수정 요청은 누구나 보낼 수 있고, 운영자가 확인한 뒤 반영해요.
            정보를 아예 내리고 싶다면{" "}
            <a href={COMPANY_CORRECTION_URL} target="_blank" rel="noreferrer" className="font-semibold text-muted-strong underline underline-offset-2 hover:text-brand">
              카카오톡 채널<span className="sr-only"> 새 창</span>
            </a>
            로 알려 주세요.
          </p>
        </div>
        <SecondaryLink href={companyRoutes.editRequest(company.id)} className="shrink-0">정보 수정 요청</SecondaryLink>
      </section>
    </div>
  );
}

function TextSection({ id, title, text }: { readonly id: string; readonly title: string; readonly text: string | null }) {
  return (
    <section aria-labelledby={id} className="px-5 py-6 sm:px-8">
      <h2 id={id} className="text-base font-bold">{title}</h2>
      {text
        ? <p className="mt-3 whitespace-pre-line text-[15px] leading-7 text-muted-strong">{text}</p>
        : <p className="mt-3 text-sm"><Undisclosed /></p>}
    </section>
  );
}

function MissingCompany() {
  return (
    <section className="mt-3 rounded-card border border-border bg-card px-6 py-14 text-center">
      <h1 className="text-lg font-bold">공연사 정보를 찾을 수 없어요</h1>
      <p className="mt-2 text-sm text-muted-strong">아직 공개하지 않았거나 주소가 바뀌었을 수 있어요.</p>
      <Link
        href={auditionPostRoutes.list()}
        className="mt-4 inline-flex min-h-11 items-center rounded-control px-3 text-sm font-semibold text-brand hover:bg-brand-soft"
      >
        공고 목록 보기
      </Link>
    </section>
  );
}

function CompanySkeleton() {
  return (
    <div role="status" aria-label="공연사 정보 불러오는 중" className="mt-3 animate-pulse space-y-4 rounded-card border border-border bg-card px-5 py-8 sm:px-8">
      <div className="h-4 w-1/6 rounded bg-border-soft" />
      <div className="h-8 w-2/3 rounded bg-border-soft" />
      <div className="h-4 w-1/2 rounded bg-border-soft" />
      <div className="h-32 rounded bg-border-soft" />
      <p className="sr-only">공연사 정보를 불러오고 있습니다.</p>
    </div>
  );
}

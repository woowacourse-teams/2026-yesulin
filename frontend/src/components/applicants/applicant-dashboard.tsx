"use client";

import { ApplicantPageContainer as PageContainer } from "./applicant-page-container";
import { useState } from "react";
import { WorkspaceBreadcrumb } from "@/components/landing/workspace-page-heading";
import Link from "next/link";
import { SiteIcon } from "@/components/ui/site-icon";
import { getApplicantSubmissions, getApplicantProfile, getRecommendedPostings } from "@/features/applicants/api";
import { getActorPageSettings } from "@/features/actor-pages/owner-api";
import { frontendEnvironment } from "@/config/environment";
import { formatApplicantDate } from "@/features/applicants/presentation";
import type { ApplicantProfileResponse, ApplicantSubmissionSummary, RecommendedPosting } from "@/features/applicants/types";
import { useAuditionQuery } from "@/features/auditions/use-audition-query";
import { ScreenError } from "@/components/auditions/screen-status";
import { PostingStatusBadge } from "@/components/applications/public-posting-status";
import { ApplicantStageHero } from "./applicant-stage-hero";
import { DashboardEmpty, LibraryPanel, SubmissionsPanel } from "./applicant-dashboard-panels";

/** 추천 공고 Backend API가 아직 없어 목 검증 환경에서만 영역을 노출한다. */
const recommendationsAvailable = frontendEnvironment.apiMockingEnabled;

async function loadRecommendations(): Promise<readonly RecommendedPosting[]> {
  if (!recommendationsAvailable) return [];
  return getRecommendedPostings(undefined, 3).then((response) => response.postings, () => []);
}

/**
 * 한 조각이 실패해도 나머지 영역은 보여 준다. 프로필은 화면의 기준 정보라
 * 실패하면 홈 전체를 다시 시도하도록 그대로 던진다.
 */
async function loadDashboard() {
  const [profile, submissions, recommendations, actorPage] = await Promise.all([
    getApplicantProfile(),
    getApplicantSubmissions().then((response) => response.submissions, () => null),
    loadRecommendations(),
    getActorPageSettings().catch((cause: unknown) => { console.error("[배우 페이지 설정 조회 실패]", cause); return null; }),
  ]);
  return { profile, submissions, recommendations, actorPage };
}

export function ApplicantDashboard() {
  const query = useAuditionQuery("applicant-dashboard", loadDashboard, "배우 홈을 불러오지 못했습니다.");
  if (query.loading) return <DashboardSkeleton />;
  if (query.error || !query.data) return <PageContainer><ScreenError message={query.error} onRetry={query.reload} /></PageContainer>;
  const { profile, submissions, recommendations, actorPage } = query.data;

  return <PageContainer>
    <WorkspaceBreadcrumb items={[{ label: "마이페이지" }]} />
    <h1 className="sr-only">마이페이지</h1>
    <ApplicantStageHero profile={profile} actorPage={actorPage} />
    <DashboardSections profile={profile} submissions={submissions} />
    {recommendationsAvailable && <Recommendations recommendations={recommendations} />}
  </PageContainer>;
}

type Section = "library" | "submissions";

function DashboardSections({ profile, submissions }: { readonly profile: ApplicantProfileResponse; readonly submissions: readonly ApplicantSubmissionSummary[] | null }) {
  const [section, setSection] = useState<Section>("library");
  return <section className="applicant-sections" aria-label="내 자료">
    <div className="applicant-section-switch" role="group" aria-label="보기 선택">
      <button type="button" aria-pressed={section === "library"} onClick={() => setSection("library")}>보관함</button>
      <button type="button" aria-pressed={section === "submissions"} onClick={() => setSection("submissions")}>지원서 {submissions && <span className="num">{submissions.length}</span>}</button>
      <Link href="/auditions" className="workspace-text-link applicant-section-link">오디션 공고 둘러보기 <SiteIcon name="next" size={16} /></Link>
    </div>
    {section === "library" && <LibraryPanel profile={profile} />}
    {section === "submissions" && <SubmissionsPanel submissions={submissions} />}
  </section>;
}

function Recommendations({ recommendations }: { readonly recommendations: readonly RecommendedPosting[] }) {
  return <section aria-labelledby="dashboard-recommendations" className="mt-12">
    <div className="max-w-2xl"><p className="text-sm font-semibold text-brand">다음 기회</p><h2 id="dashboard-recommendations" className="mt-1 text-2xl font-bold tracking-[-0.025em]">둘러볼 수 있는 공고</h2><p className="mt-2 leading-7 text-muted-strong">예술in은 현재 기획사/제작사가 공유한 링크 중심으로 접수합니다. 아래 공고는 다음 지원을 위한 제안이에요.</p></div>
    {recommendations.length > 0 && <ul className="mt-6 grid gap-4 md:grid-cols-3">{recommendations.map((posting) => <RecommendationCard key={posting.id} posting={posting} />)}</ul>}
    {recommendations.length === 0 && <div className="mt-5"><DashboardEmpty title="지금은 다른 공고가 없어요" detail="새로운 공고가 생기면 이 영역에서 확인할 수 있어요." /></div>}
  </section>;
}

function RecommendationCard({ posting }: { readonly posting: RecommendedPosting }) {
  const date = posting.status === "UPCOMING" ? posting.recruitmentStart : posting.recruitmentEnd;
  const label = posting.status === "UPCOMING" ? "지원 시작" : "접수 마감";
  return <li><Link href={`/apply/${posting.id}?prefill=1`} className="group flex min-h-52 flex-col rounded-card border border-border bg-card p-5 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-brand-line hover:shadow-[var(--shadow-1)]"><div className="flex items-center gap-2"><PostingStatusBadge status={posting.status} /><span className="truncate text-xs text-muted">{posting.companyName}</span></div><strong className="mt-5 line-clamp-2 text-lg leading-7 group-hover:text-brand">{posting.performanceTitle}</strong><span className="mt-1 line-clamp-1 text-sm text-muted-strong">{posting.title}</span><span className="num mt-auto pt-5 text-sm font-medium text-muted">{label} · {formatApplicantDate(date)}</span></Link></li>;
}

function DashboardSkeleton() {
  return <PageContainer><div role="status" aria-label="배우 홈 불러오는 중" className="animate-pulse"><div className="h-9 w-72 rounded-lg bg-border" /><div className="mt-4 h-5 w-96 max-w-full rounded bg-border-soft" /><div className="mt-9 h-80 rounded-modal bg-border" /><div className="mt-12 h-52 rounded-modal bg-border-soft" /></div></PageContainer>;
}

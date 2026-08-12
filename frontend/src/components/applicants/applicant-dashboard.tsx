"use client";

import Image from "next/image";
import Link from "next/link";
import { getApplicantApplications, getApplicantProfile, getRecommendedPostings } from "@/features/applicants/api";
import { formatApplicantDate } from "@/features/applicants/presentation";
import { applicantRoutes } from "@/features/applicants/routes";
import type { ApplicantApplicationSummary, RecommendedPosting } from "@/features/applicants/types";
import { useAuditionQuery } from "@/features/auditions/use-audition-query";
import { ScreenError } from "@/components/auditions/screen-status";
import { PostingStatusBadge } from "@/components/applications/public-posting-status";

async function loadDashboard() {
  const [profile, applications, recommendations] = await Promise.all([
    getApplicantProfile(),
    getApplicantApplications(),
    getRecommendedPostings(undefined, 3),
  ]);
  return { profile, applications: applications.applications, recommendations: recommendations.postings };
}

export function ApplicantDashboard() {
  const query = useAuditionQuery("applicant-dashboard", loadDashboard, "지원자 홈을 불러오지 못했습니다.");
  if (query.loading) return <DashboardSkeleton />;
  if (query.error || !query.data) return <PageContainer><ScreenError message={query.error} onRetry={query.reload} /></PageContainer>;
  const { profile, applications, recommendations } = query.data;
  const percent = Math.round((profile.completeness.filled / profile.completeness.standardTotal) * 100);

  return <PageContainer>
    <header className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div><p className="text-sm font-semibold text-brand">안녕하세요, 지원자님</p><h1 className="mt-2 text-[clamp(28px,4vw,38px)] font-bold tracking-[-0.035em]">다음 지원을 준비해 볼까요?</h1><p className="mt-3 text-base leading-7 text-muted-strong">저장한 프로필과 지원 이력을 한곳에서 관리할 수 있어요.</p></div>
      <Link href={applicantRoutes.profile} className="inline-flex min-h-12 items-center justify-center self-start rounded-control bg-brand px-5 font-semibold text-white hover:bg-brand-strong">프로필 이어서 작성</Link>
    </header>

    <section className="mt-9 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
      <article className="rounded-card bg-sidebar p-6 text-white md:p-7">
        <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-brand-line">내 프로필</p><h2 className="mt-2 text-xl font-bold text-white">기본 정보 {profile.completeness.filled} / {profile.completeness.standardTotal}개 저장</h2></div><strong className="num text-2xl text-white">{percent}%</strong></div>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-brand-line" style={{ width: `${percent}%` }} /></div>
        <p className="mt-4 text-sm leading-6 text-sidebar-muted">프로필은 지원서의 빈칸을 미리 채우는 데 사용돼요. 이미 제출한 지원서 내용은 바뀌지 않습니다.</p>
        <Link href={applicantRoutes.profile} className="mt-5 inline-flex min-h-11 items-center rounded-control border border-sidebar-line px-4 text-sm font-semibold text-white hover:bg-sidebar-hover">프로필 관리</Link>
      </article>
      <article className="rounded-card border border-border bg-card p-6 md:p-7">
        <div className="flex items-center justify-between gap-4"><div><p className="text-sm font-semibold text-brand">최근 지원</p><h2 className="mt-1 text-xl font-bold">제출한 지원서</h2></div><Link href={applicantRoutes.applications} className="min-h-11 rounded-control px-3 py-2 text-sm font-semibold text-brand hover:bg-brand-soft">전체 보기</Link></div>
        {applications.length ? <ul className="mt-5 divide-y divide-border-soft">{applications.slice(0, 2).map((application) => <RecentApplication key={application.id} application={application} />)}</ul> : <DashboardEmpty title="아직 제출한 지원서가 없어요" detail="외부 공고의 예술in 지원 링크에서 지원서를 작성하면 여기에 모아 볼 수 있어요." />}
      </article>
    </section>

    <section aria-labelledby="dashboard-recommendations" className="mt-12">
      <div className="max-w-2xl"><p className="text-sm font-semibold text-brand">다음 기회</p><h2 id="dashboard-recommendations" className="mt-1 text-2xl font-bold tracking-[-0.025em]">둘러볼 수 있는 공고</h2><p className="mt-2 leading-7 text-muted-strong">예술in은 현재 공연사가 공유한 링크 중심으로 접수합니다. 아래 공고는 다음 지원을 위한 제안이에요.</p></div>
      {recommendations.length ? <ul className="mt-6 grid gap-4 md:grid-cols-3">{recommendations.map((posting) => <RecommendationCard key={posting.id} posting={posting} />)}</ul> : <DashboardEmpty title="지금은 다른 공고가 없어요" detail="새로운 공고가 생기면 이 영역에서 확인할 수 있어요." />}
    </section>
  </PageContainer>;
}

function RecentApplication({ application }: { readonly application: ApplicantApplicationSummary }) {
  return <li><Link href={applicantRoutes.application(application.id)} className="group grid grid-cols-[52px_minmax(0,1fr)_auto] items-center gap-3 py-4"><Image src={application.posterUrl} alt="" width={52} height={68} className="h-[68px] w-[52px] rounded-md object-cover" /><span className="min-w-0"><strong className="block truncate group-hover:text-brand">{application.performanceTitle}</strong><span className="mt-1 block truncate text-sm text-muted-strong">{application.roleName} · {formatApplicantDate(application.submittedAt)} 제출</span></span><span className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs font-semibold text-muted-strong">제출 완료</span></Link></li>;
}

function RecommendationCard({ posting }: { readonly posting: RecommendedPosting }) {
  const date = posting.status === "UPCOMING" ? posting.recruitmentStart : posting.recruitmentEnd;
  const label = posting.status === "UPCOMING" ? "지원 시작" : "접수 마감";
  return <li><Link href={`/apply/${posting.id}?prefill=1`} className="group flex min-h-52 flex-col rounded-card border border-border bg-card p-5 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-brand-line hover:shadow-[var(--shadow-1)]"><div className="flex items-center gap-2"><PostingStatusBadge status={posting.status} /><span className="truncate text-xs text-muted">{posting.companyName}</span></div><strong className="mt-5 line-clamp-2 text-lg leading-7 group-hover:text-brand">{posting.performanceTitle}</strong><span className="mt-1 line-clamp-1 text-sm text-muted-strong">{posting.title}</span><span className="num mt-auto pt-5 text-sm font-medium text-muted">{label} · {formatApplicantDate(date)}</span></Link></li>;
}

function PageContainer({ children }: { readonly children: React.ReactNode }) {
  return <div className="mx-auto w-full max-w-[1180px] px-5 py-9 md:px-8 md:py-12">{children}</div>;
}

function DashboardEmpty({ title, detail }: { readonly title: string; readonly detail: string }) {
  return <div className="mt-5 rounded-card border border-dashed border-border bg-surface px-5 py-8 text-center"><strong>{title}</strong><p className="mt-2 text-sm leading-6 text-muted">{detail}</p></div>;
}

function DashboardSkeleton() {
  return <PageContainer><div aria-label="지원자 홈 불러오는 중" className="animate-pulse"><div className="h-9 w-72 rounded-lg bg-border" /><div className="mt-4 h-5 w-96 max-w-full rounded bg-border-soft" /><div className="mt-9 grid gap-4 lg:grid-cols-2"><div className="h-64 rounded-modal bg-border" /><div className="h-64 rounded-modal bg-border-soft" /></div><div className="mt-12 h-52 rounded-modal bg-border-soft" /></div></PageContainer>;
}

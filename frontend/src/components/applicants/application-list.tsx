"use client";

import Image from "next/image";
import Link from "next/link";
import { getApplicantApplications } from "@/features/applicants/api";
import { applicationAvailability, formatApplicantDate } from "@/features/applicants/presentation";
import { applicantRoutes } from "@/features/applicants/routes";
import type { ApplicantApplicationSummary } from "@/features/applicants/types";
import { useAuditionQuery } from "@/features/auditions/use-audition-query";
import { ScreenError } from "@/components/auditions/screen-status";

export function ApplicantApplicationList() {
  const query = useAuditionQuery("applicant-applications", getApplicantApplications, "지원서 목록을 불러오지 못했습니다.");
  if (query.loading) return <ApplicationListSkeleton />;
  if (query.error || !query.data) return <Container><ScreenError message={query.error} onRetry={query.reload} /></Container>;
  const applications = query.data.applications;

  return <Container>
    <header><p className="text-sm font-semibold text-brand">내 지원서</p><h1 className="mt-2 text-[clamp(28px,4vw,38px)] font-bold tracking-[-0.035em]">지원한 오디션을 모아보세요.</h1><p className="mt-3 max-w-2xl leading-7 text-muted-strong">제출 당시 내용은 프로필과 분리된 불변 스냅샷으로 보관됩니다.</p></header>
    {applications.length ? <ul className="mt-8 grid gap-4">{applications.map((application) => <ApplicationCard key={application.id} application={application} />)}</ul> : <EmptyApplications />}
  </Container>;
}

function ApplicationCard({ application }: { readonly application: ApplicantApplicationSummary }) {
  const availability = applicationAvailability(application.editable);
  return <li><Link href={applicantRoutes.application(application.id)} className="group grid gap-5 rounded-card border border-border bg-card p-5 transition-[border-color,box-shadow] hover:border-brand-line hover:shadow-[var(--shadow-1)] sm:grid-cols-[88px_minmax(0,1fr)_auto] sm:items-center md:p-6">
    <Image src={application.posterUrl} alt={`${application.performanceTitle} 포스터`} width={88} height={116} unoptimized className="h-[116px] w-[88px] rounded-control object-cover" />
    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${availability.tone}`}>{availability.label}</span><span className="text-xs text-muted">{application.companyName}</span></div><h2 className="mt-3 truncate text-lg font-bold group-hover:text-brand">{application.performanceTitle}</h2><p className="mt-1 truncate text-sm text-muted-strong">{application.postingTitle} · {application.roleName}</p><dl className="mt-4 grid gap-x-4 gap-y-1 text-sm sm:grid-cols-[84px_1fr]"><dt className="text-muted">제출일</dt><dd className="num">{formatApplicantDate(application.submittedAt, true)}</dd><dt className="text-muted">보관 상태</dt><dd className="font-medium">읽기 전용 스냅샷</dd></dl></div>
    <span className="inline-flex min-h-11 items-center justify-center self-end rounded-control border border-border px-4 text-sm font-semibold text-muted-strong group-hover:border-brand-line group-hover:bg-brand-soft group-hover:text-brand sm:self-center">상세 보기</span>
  </Link></li>;
}

function EmptyApplications() {
  return <section className="mt-8 rounded-card border border-dashed border-border bg-card px-6 py-14 text-center"><span aria-hidden="true" className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-brand-soft text-brand"><svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]"><path d="M7 3.5h8l3 3V20.5H7z" /><path d="M15 3.5v4h3M9.5 11h6M9.5 14.5h6M9.5 18h4" /></svg></span><h2 className="mt-5 text-lg font-bold">아직 지원한 공고가 없어요</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">로그인한 상태로 지원서를 제출하면 이곳에 자동으로 모입니다.</p></section>;
}

function Container({ children }: { readonly children: React.ReactNode }) { return <div className="mx-auto max-w-[980px] px-5 py-9 md:px-8 md:py-12">{children}</div>; }
function ApplicationListSkeleton() { return <Container><div aria-label="지원서 목록 불러오는 중" className="animate-pulse"><div className="h-9 w-72 rounded bg-border" /><div className="mt-4 h-5 w-full max-w-xl rounded bg-border-soft" /><div className="mt-10 space-y-4">{[0, 1].map((item) => <div key={item} className="h-52 rounded-card bg-border-soft" />)}</div></div></Container>; }

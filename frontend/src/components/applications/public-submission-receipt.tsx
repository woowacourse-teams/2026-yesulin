"use client";

import Link from "next/link";
import { publicPostingAvailability, publicPostingRecommendations } from "@/features/applications/public-posting";
import type { PublicPosting } from "@/features/applications/public-posting";
import { usePublicApplication } from "./public-application-context";
import { PostingStatusBadge } from "./public-posting-status";
import { formatApplicantDate } from "@/features/applicants/presentation";
import { applicantRoutes } from "@/features/applicants/routes";
import { PrimaryLink, TextButton } from "@/components/ui/controls";

export function PublicSubmissionReceipt() {
  const { state, actions, meta } = usePublicApplication();
  const receipt = state.receipt!;
  const recommendations = publicPostingRecommendations(meta.postingId);

  return <main className="min-h-screen bg-surface px-5 py-10 text-foreground md:px-8 md:py-14">
    <div className="mx-auto max-w-[880px]">
      <section className="rounded-card border border-border bg-card px-5 py-9 text-center md:px-10 md:py-11">
        <span aria-hidden="true" className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-soft text-2xl font-bold text-brand">✓</span>
        <p className="mt-6 text-sm font-semibold text-brand">지원 완료</p>
        <h1 className="mt-2 text-2xl font-bold tracking-[-0.025em] md:text-[28px]">지원서 작성을 완료했어요.</h1>
        <p className="mt-3 leading-7 text-muted-strong">제출한 내용은 계정의 내 지원서에서 읽기 전용으로 확인할 수 있어요.</p>
        {receipt.profileSaved === true ? <p role="status" className="mx-auto mt-4 max-w-[560px] rounded-control border border-brand-line bg-brand-soft px-4 py-3 text-sm font-medium leading-6 text-brand">이번 지원서의 기본·추가 정보를 프로필에도 저장했어요.</p> : null}
        {receipt.profileSaved === false ? <p role="status" className="mx-auto mt-4 max-w-[560px] rounded-control border border-warn/20 bg-warn-bg px-4 py-3 text-sm font-medium leading-6 text-warn">지원서는 제출됐지만 프로필 저장은 완료하지 못했어요. 프로필에서 직접 수정할 수 있어요.</p> : null}
        <section aria-label="지원 완료 정보" className="mt-8 rounded-card border border-border bg-surface p-5 text-left md:p-6">
          <dl className="grid gap-x-4 gap-y-3 text-sm md:grid-cols-[96px_1fr]">
            <dt className="text-muted">공연</dt><dd className="font-medium">{meta.performanceTitle}</dd>
            <dt className="text-muted">공고</dt><dd className="font-medium">{meta.postingTitle}</dd>
            <dt className="text-muted">선택 배역</dt><dd className="font-medium">{meta.roleName}</dd>
            <dt className="text-muted">제출 시각</dt><dd className="num font-medium">{formatApplicantDate(receipt.submittedAt, true)}</dd>
          </dl>
          <PrimaryLink href={applicantRoutes.submission(receipt.submissionId)} className="mt-5 w-full">내 지원서에서 확인</PrimaryLink>
        </section>
      </section>

      <section aria-labelledby="recommended-postings-title" className="mt-10">
        <div className="flex items-end gap-4"><div><p className="text-sm font-semibold text-brand">다음 기회 찾기</p><h2 id="recommended-postings-title" className="mt-1 text-xl font-bold tracking-[-0.02em]">다른 공고도 둘러보세요</h2></div><TextButton onClick={actions.requestBack} className="ml-auto px-3 hover:bg-card hover:text-brand">공고로 돌아가기</TextButton></div>
        <ul className="mt-5 grid gap-3 md:grid-cols-3">{recommendations.map((posting) => <RecommendedPosting key={posting.id} posting={posting} />)}</ul>
      </section>
    </div>
  </main>;
}

function RecommendedPosting({ posting }: { posting: PublicPosting }) {
  const availability = publicPostingAvailability(posting);
  return <li><Link href={`/apply/${posting.id}`} className="group flex h-full min-h-40 flex-col rounded-card border border-border bg-card p-5 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-brand-line hover:shadow-[var(--shadow-1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"><div className="flex items-center gap-2"><PostingStatusBadge status={posting.status} /><span className="truncate text-xs font-medium text-muted">{posting.companyName}</span></div><strong className="mt-4 line-clamp-2 text-base leading-6 group-hover:text-brand">{posting.performanceTitle}</strong><span className="mt-1 line-clamp-1 text-sm text-muted-strong">{posting.title}</span><span className="num mt-auto pt-4 text-xs font-medium text-muted">{availability.label} · {availability.detail}</span></Link></li>;
}

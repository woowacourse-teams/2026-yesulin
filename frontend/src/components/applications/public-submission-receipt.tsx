"use client";

import { usePublicApplication } from "./public-application-context";
import { formatApplicantDate } from "@/features/applicants/presentation";
import { applicantRoutes } from "@/features/applicants/routes";
import { PrimaryLink, TextButton } from "@/components/ui/controls";

export function PublicSubmissionReceipt() {
  const { state, actions, meta } = usePublicApplication();
  const receipt = state.receipt!;

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
        <TextButton onClick={actions.requestBack} className="mt-5 px-3 hover:bg-surface hover:text-brand">공고로 돌아가기</TextButton>
      </section>
    </div>
  </main>;
}

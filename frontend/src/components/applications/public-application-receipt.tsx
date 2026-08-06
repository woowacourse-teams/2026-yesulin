"use client";

import { useState } from "react";
import Link from "next/link";
import { publicPostingAvailability, publicPostingRecommendations } from "@/features/applications/public-posting";
import type { PublicPosting } from "@/features/applications/public-posting";
import { usePublicApplication } from "./public-application-context";
import { PostingStatusBadge } from "./public-posting-status";

export function PublicApplicationReceipt() {
  const { state, actions, meta } = usePublicApplication();
  const [copied, setCopied] = useState(false);
  const receipt = state.receipt!;
  const recommendations = publicPostingRecommendations(meta.postingId);
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(receipt.number);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return <main className="min-h-screen bg-surface px-5 py-10 text-foreground md:px-8 md:py-14">
    <div className="mx-auto max-w-[880px]">
      <section className="rounded-modal border border-border bg-card px-5 py-9 text-center shadow-[var(--shadow-1)] md:px-10 md:py-11">
        <span aria-hidden="true" className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-brand-soft text-2xl font-bold text-brand">✓</span>
        <p className="mt-6 text-sm font-semibold text-brand">지원 완료</p>
        <h1 className="mt-2 text-2xl font-bold tracking-[-0.025em] md:text-[28px]">지원서 작성을 완료했어요.</h1>
        <p className="mt-3 leading-7 text-muted-strong">지원 내용을 확인할 수 있도록 조회 코드를 보관해 주세요.</p>
        <section aria-label="지원 완료 정보" className="mt-8 rounded-card border border-border bg-surface p-5 text-left md:p-6">
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-0 flex-1"><p className="text-sm text-muted">지원 조회 코드</p><strong className="num mt-1 block break-all text-xl tracking-[0.02em] text-foreground">{receipt.number}</strong></div>
            <button type="button" onClick={copyCode} className="inline-flex min-h-11 items-center rounded-control border border-border bg-card px-4 text-sm font-semibold text-muted-strong hover:border-brand-line hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">{copied ? "복사됨" : "코드 복사"}</button>
          </div>
          <p role="status" className="mt-2 text-xs leading-5 text-muted">현재 데모에는 재조회 기능이 연결되지 않아 이 코드는 화면 확인용으로만 생성됩니다.</p>
          <dl className="mt-5 grid gap-x-4 gap-y-3 border-t border-border-soft pt-5 text-sm md:grid-cols-[96px_1fr]">
            <dt className="text-muted">공연</dt><dd className="font-medium">{meta.performanceTitle}</dd>
            <dt className="text-muted">공고</dt><dd className="font-medium">{meta.postingTitle}</dd>
            <dt className="text-muted">선택 배역</dt><dd className="font-medium">{meta.roleName}</dd>
            <dt className="text-muted">제출 시각</dt><dd className="num font-medium">{receipt.submittedAt}</dd>
          </dl>
        </section>
      </section>

      <section className="mt-8 overflow-hidden rounded-modal bg-sidebar px-5 py-8 text-white md:flex md:items-center md:gap-8 md:px-8">
        <div className="min-w-0 flex-1"><p className="text-sm font-semibold text-brand-line">지원 내역을 한곳에서</p><h2 className="mt-2 text-xl font-bold tracking-[-0.02em]">회원가입하시고 다른 공고도 지원해 보세요.</h2><p className="mt-3 text-sm leading-6 text-sidebar-muted">계정을 만들면 앞으로 지원한 공고와 자료를 한곳에서 관리할 수 있어요. 현재 완료한 데모 지원서는 계정에 자동 등록되지 않습니다.</p></div>
        <Link href="/signup" className="mt-6 inline-flex min-h-12 w-full shrink-0 items-center justify-center rounded-control bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white md:mt-0 md:w-auto">회원가입</Link>
      </section>

      <section aria-labelledby="recommended-postings-title" className="mt-10">
        <div className="flex items-end gap-4"><div><p className="text-sm font-semibold text-brand">다음 기회 찾기</p><h2 id="recommended-postings-title" className="mt-1 text-xl font-bold tracking-[-0.02em]">다른 공고도 둘러보세요</h2></div><button type="button" onClick={actions.requestBack} className="ml-auto min-h-11 rounded-control px-3 text-sm font-semibold text-muted-strong hover:bg-card hover:text-brand focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">공고로 돌아가기</button></div>
        <ul className="mt-5 grid gap-3 md:grid-cols-3">{recommendations.map((posting) => <RecommendedPosting key={posting.id} posting={posting} />)}</ul>
      </section>
    </div>
  </main>;
}

function RecommendedPosting({ posting }: { posting: PublicPosting }) {
  const availability = publicPostingAvailability(posting);
  return <li><Link href={`/apply/${posting.id}`} className="group flex h-full min-h-40 flex-col rounded-card border border-border bg-card p-5 transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-brand-line hover:shadow-[var(--shadow-1)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"><div className="flex items-center gap-2"><PostingStatusBadge status={posting.status} /><span className="truncate text-xs font-medium text-muted">{posting.companyName}</span></div><strong className="mt-4 line-clamp-2 text-base leading-6 group-hover:text-brand">{posting.performanceTitle}</strong><span className="mt-1 line-clamp-1 text-sm text-muted-strong">{posting.title}</span><span className="num mt-auto pt-4 text-xs font-medium text-muted">{availability.label} · {availability.detail}</span></Link></li>;
}

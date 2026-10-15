import Link from "next/link";
import type { ReactNode } from "react";
import { LandingFooter, LandingHeader } from "@/components/landing/landing-header";
import { auditionPostRoutes } from "@/features/audition-posts/types";

export function AuditionPostScreen({ children }: { readonly children: ReactNode }) {
  return (
    <div className="public-notebook">
      <a className="notebook-skip" href="#main">본문으로 바로가기</a>
      <LandingHeader service="applicant" />
      <main id="main" className="notebook-container notebook-reading pb-16 pt-6 md:pt-10">
        <Link
          href={auditionPostRoutes.list()}
          className="-ml-2 inline-flex min-h-11 items-center rounded-control px-2 text-sm font-semibold text-muted-strong hover:bg-white hover:text-foreground"
        >
          공고 목록
        </Link>
        {children}
      </main>
      <LandingFooter />
    </div>
  );
}

export function MissingAuditionPost() {
  return (
    <section className="mt-3 rounded-card border border-border bg-card px-6 py-14 text-center">
      <h1 className="text-lg font-bold">공고를 찾을 수 없어요</h1>
      <p className="mt-2 text-sm text-muted-strong">내려간 공고이거나 주소가 바뀌었을 수 있어요.</p>
      <Link
        href={auditionPostRoutes.list()}
        className="mt-4 inline-flex min-h-11 items-center rounded-control px-3 text-sm font-semibold text-brand hover:bg-brand-soft"
      >
        공고 목록 보기
      </Link>
    </section>
  );
}

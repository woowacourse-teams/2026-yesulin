import Link from "next/link";
import { ContentState } from "@/components/ui/content-state";
import { SecondaryLink } from "@/components/ui/controls";
import type { ReactNode } from "react";
import { LandingFooter, LandingHeader } from "@/components/landing/landing-header";
import { auditionPostRoutes } from "@/features/audition-posts/types";

export function AuditionPostScreen({ children }: { readonly children: ReactNode }) {
  return (
    <div className="public-notebook">
      <a className="notebook-skip" href="#main">본문으로 바로가기</a>
      <LandingHeader service="applicant" />
      <main id="main" className="notebook-container pb-16 pt-6 md:pt-10">
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
  return <ContentState headingLevel={1} className="mt-3" title="공고를 찾을 수 없어요" description="공고가 숨겨졌거나 주소가 바뀌었을 수 있어요." action={<SecondaryLink href={auditionPostRoutes.list()}>공고 목록 보기</SecondaryLink>} />;
}

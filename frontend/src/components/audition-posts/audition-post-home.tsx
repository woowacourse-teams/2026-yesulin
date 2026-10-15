import { NotebookFooter, NotebookHeader } from "@/components/landing/notebook-site-layout";
import { HomeFaqSection, HomeShowSection } from "@/components/landing/notebook-home-sections";
import type { AuditionPostPage } from "@/features/audition-posts/types";
import type { PublicShowSummary } from "@/features/shows/types";
import { AuditionAlertBanner } from "./audition-alert-banner";
import { AuditionPostListSection } from "./audition-post-list-section";

/** 메인은 공고 3개, 무료 공연과 FAQ를 소개한다. 전체 목록은 /auditions에서 본다. */
export function AuditionPostHome({ initialPage, initialShows = null }: {
  readonly initialPage: AuditionPostPage | null;
  readonly initialShows?: readonly PublicShowSummary[] | null;
}) {
  return <div className="public-notebook">
    <a className="notebook-skip" href="#main">본문으로 바로가기</a><NotebookHeader />
    <main id="main" className="notebook-container notebook-content">
      <AuditionAlertBanner />
      <AuditionPostListSection query={{ page: 0, includeClosed: false }} initialPage={initialPage} preview />
      <HomeShowSection initialShows={initialShows} /><HomeFaqSection />
    </main><NotebookFooter />
  </div>;
}

import { NotebookFooter, NotebookHeader } from "@/components/landing/notebook-site-layout";
import { HomeFaqSection, HomeShowSection } from "@/components/landing/notebook-home-sections";
import type { AuditionPostPage, AuditionPostSort } from "@/features/audition-posts/types";
import type { EventBanner } from "@/features/events/types";
import type { PublicShowSummary } from "@/features/shows/types";
import { AuditionAlertBanner } from "./audition-alert-banner";
import { AuditionPostListSection } from "./audition-post-list-section";

/** 메인은 공고 3개, 무료 공연과 FAQ를 소개한다. 전체 목록은 /auditions에서 본다. */
export function AuditionPostHome({ initialPage, initialShows = null, initialEventBanners = null, sort }: {
  readonly initialPage: AuditionPostPage | null;
  readonly initialShows?: readonly PublicShowSummary[] | null;
  /** 서버가 읽은 노출 중인 이벤트 배너. null이면 브라우저에서 읽는다. */
  readonly initialEventBanners?: readonly EventBanner[] | null;
  readonly sort?: AuditionPostSort;
}) {
  return <div className="public-notebook">
    <a className="notebook-skip" href="#main">본문으로 바로가기</a><NotebookHeader />
    <main id="main" className="notebook-container notebook-content">
      <AuditionAlertBanner initialEventBanners={initialEventBanners} />
      <AuditionPostListSection query={{ page: 0, includeClosed: false, sort }} initialPage={initialPage} preview />
      <HomeShowSection initialShows={initialShows} /><HomeFaqSection />
    </main><NotebookFooter />
  </div>;
}

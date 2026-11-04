import { NotebookFooter, NotebookHeader } from "@/components/landing/notebook-site-layout";
import { HomeFaqSection, HomeShowSection } from "@/components/landing/notebook-home-sections";
import { CategoryShortcuts } from "@/components/home/category-shortcuts";
import { HomePostRows } from "@/components/home/home-post-rows";
import { QuickBanners } from "@/components/home/quick-banners";
import type { AuditionPostPage } from "@/features/audition-posts/types";
import type { EventBanner } from "@/features/events/types";
import type { PublicShowSummary } from "@/features/shows/types";
import { AuditionAlertBanner } from "./audition-alert-banner";

/** 메인은 배너·분야 바로가기 아래에 공고·공연 포스터 줄을 쌓는다. 전체 목록은 /auditions에서 본다. */
export function AuditionPostHome({ initialLatest = null, initialDeadline = null, initialShows = null, initialEventBanners = null }: {
  readonly initialLatest?: AuditionPostPage | null;
  readonly initialDeadline?: AuditionPostPage | null;
  readonly initialShows?: readonly PublicShowSummary[] | null;
  /** 서버가 읽은 노출 중인 이벤트 배너. null이면 브라우저에서 읽는다. */
  readonly initialEventBanners?: readonly EventBanner[] | null;
}) {
  return <div className="public-notebook">
    <a className="notebook-skip" href="#main">본문으로 바로가기</a><NotebookHeader />
    <main id="main" className="notebook-container notebook-content home-main">
      <h1 className="sr-only">예술in 오디션 공고와 무료 공연</h1>
      <AuditionAlertBanner initialEventBanners={initialEventBanners} />
      <CategoryShortcuts posts={initialLatest?.posts ?? null} />
      <HomePostRows initialLatest={initialLatest} initialDeadline={initialDeadline} />
      <QuickBanners />
      <HomeShowSection initialShows={initialShows} />
      <HomeFaqSection />
    </main><NotebookFooter />
  </div>;
}

import type { Metadata } from "next";
import { AuditionPostHome } from "@/components/audition-posts/audition-post-home";
import { MswProvider } from "@/components/mocks/msw-provider";
import { JsonLd } from "@/components/seo/json-ld";
import { auditionPostPageForServer } from "@/features/audition-posts/server";
import { HOME_DEADLINE_SIZE, HOME_LATEST_POOL_SIZE } from "@/features/audition-posts/home-query";
import { eventBannersForServer } from "@/features/events/server";
import { HOME_DESCRIPTION, HOME_TITLE, socialMetadata } from "@/features/seo/audition-metadata";
import { homeStructuredData } from "@/features/seo/structured-data";
import { publicShowsForServer } from "@/features/shows/server";

export const revalidate = 300;

export const metadata: Metadata = {
  alternates: { canonical: "/", types: { "application/rss+xml": "/rss.xml" } },
  ...socialMetadata({ title: HOME_TITLE, description: HOME_DESCRIPTION, url: "/" }),
};

export default async function HomePage() {
  const cacheOptions = { next: { revalidate } };
  const [initialLatest, initialDeadline, initialShows, initialEventBanners] = await Promise.all([
    auditionPostPageForServer({ page: 0, includeClosed: false }, HOME_LATEST_POOL_SIZE, cacheOptions),
    auditionPostPageForServer({ page: 0, includeClosed: false, sort: "deadline" }, HOME_DEADLINE_SIZE, cacheOptions),
    publicShowsForServer(cacheOptions).catch(() => null),
    eventBannersForServer(cacheOptions).catch(() => null),
  ]);
  return (
    <>
      <JsonLd id="home-structured-data" data={homeStructuredData} />
      <MswProvider>
        <AuditionPostHome
          renderedAt={new Date().getTime()}
          initialLatest={initialLatest}
          initialDeadline={initialDeadline}
          initialShows={initialShows}
          initialEventBanners={initialEventBanners}
        />
      </MswProvider>
    </>
  );
}

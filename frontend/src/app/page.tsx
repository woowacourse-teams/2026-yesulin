import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuditionPostHome } from "@/components/audition-posts/audition-post-home";
import { MswProvider } from "@/components/mocks/msw-provider";
import { JsonLd } from "@/components/seo/json-ld";
import { auditionPostPageForServer } from "@/features/audition-posts/server";
import { auditionPostRoutes, parseAuditionPostQuery } from "@/features/audition-posts/types";
import { homeStructuredData } from "@/features/seo/structured-data";
import { publicShowsForServer } from "@/features/shows/server";

type SearchParams = Promise<{ readonly page?: string | string[]; readonly closed?: string | string[] }>;

export const metadata: Metadata = {
  alternates: { canonical: "/", types: { "application/rss+xml": "/rss.xml" } },
};

export default async function HomePage({ searchParams }: { readonly searchParams: SearchParams }) {
  const query = parseAuditionPostQuery(await searchParams);
  // 기존 공유 목록 주소를 새 목록 페이지에서 계속 사용할 수 있게 한다.
  if (query.page > 0 || query.includeClosed) redirect(auditionPostRoutes.list(query));
  const [initialPage, initialShows] = await Promise.all([
    auditionPostPageForServer(query),
    publicShowsForServer().catch(() => null),
  ]);
  return (
    <>
      <JsonLd id="home-structured-data" data={homeStructuredData} />
      <MswProvider>
        <AuditionPostHome
          initialPage={initialPage}
          initialShows={initialShows}
        />
      </MswProvider>
    </>
  );
}

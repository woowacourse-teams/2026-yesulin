import type { Metadata } from "next";
import { AuditionPostHome } from "@/components/audition-posts/audition-post-home";
import { MswProvider } from "@/components/mocks/msw-provider";
import { JsonLd } from "@/components/seo/json-ld";
import { auditionPostPageForServer } from "@/features/audition-posts/server";
import { parseAuditionPostQuery } from "@/features/audition-posts/types";
import { homeStructuredData } from "@/features/seo/structured-data";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

type SearchParams = Promise<{ readonly page?: string | string[]; readonly closed?: string | string[] }>;

export default async function HomePage({ searchParams }: { readonly searchParams: SearchParams }) {
  const query = parseAuditionPostQuery(await searchParams);
  const initialPage = await auditionPostPageForServer(query);
  return (
    <>
      <JsonLd id="home-structured-data" data={homeStructuredData} />
      <MswProvider>
        <AuditionPostHome
          key={`${query.page}-${query.includeClosed}`}
          query={query}
          initialPage={initialPage}
        />
      </MswProvider>
    </>
  );
}

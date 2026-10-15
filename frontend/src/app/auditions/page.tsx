import type { Metadata } from "next";
import { AuditionPostList } from "@/components/audition-posts/audition-post-list";
import { MswProvider } from "@/components/mocks/msw-provider";
import { publishedAuditionPostPageForServer } from "@/features/audition-posts/server";
import { parseAuditionPostQuery } from "@/features/audition-posts/types";
import { auditionListMetadata } from "@/features/seo/audition-metadata";

type Props = {
  readonly searchParams: Promise<{ page?: string | string[]; closed?: string | string[] }>;
};

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  return auditionListMetadata(parseAuditionPostQuery(await searchParams));
}

export default async function AuditionsPage({ searchParams }: Props) {
  const query = parseAuditionPostQuery(await searchParams);
  const initialPage = await publishedAuditionPostPageForServer(query);
  return <MswProvider><AuditionPostList key={`${query.page}-${query.includeClosed}`} query={query} initialPage={initialPage} /></MswProvider>;
}

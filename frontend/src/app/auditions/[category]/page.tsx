import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuditionPostList } from "@/components/audition-posts/audition-post-list";
import { MswProvider } from "@/components/mocks/msw-provider";
import { publishedAuditionPostPageForServer } from "@/features/audition-posts/server";
import { auditionLandingCategory, parseAuditionPostQuery } from "@/features/audition-posts/types";
import { auditionListMetadata } from "@/features/seo/audition-metadata";

type Props = {
  readonly params: Promise<{ category: string }>;
  readonly searchParams: Promise<{ page?: string | string[]; closed?: string | string[]; sort?: string | string[] }>;
};

async function listQuery({ params, searchParams }: Props) {
  const category = auditionLandingCategory((await params).category);
  if (!category) notFound();
  return { ...parseAuditionPostQuery(await searchParams), category };
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  return auditionListMetadata(await listQuery(props));
}

export default async function AuditionCategoryPage(props: Props) {
  const query = await listQuery(props);
  const initialPage = await publishedAuditionPostPageForServer(query);
  return (
    <MswProvider>
      <AuditionPostList key={`${query.category}-${query.page}-${query.includeClosed}-${query.sort ?? "latest"}`} query={query} initialPage={initialPage} />
    </MswProvider>
  );
}

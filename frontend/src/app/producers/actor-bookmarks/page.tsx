import type { Metadata } from "next";
import { ProducerActorBookmarks } from "@/components/actor-pages/producer-actor-bookmarks";
import { parseActorListPage } from "@/features/actor-pages/types";

export const metadata: Metadata = { title: "관심 배우" };

export default async function ProducerActorBookmarksPage({ searchParams }: { readonly searchParams: Promise<{ readonly page?: string | string[] }> }) {
  const { page } = await searchParams;
  return <ProducerActorBookmarks page={parseActorListPage(page)} />;
}

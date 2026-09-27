import type { Metadata } from "next";
import { ProducerShowDetail } from "@/components/shows/manage/producer-show-detail";

export const metadata: Metadata = { title: "무료 공연 관리" };

export default async function ProducerShowPage({ params }: { readonly params: Promise<{ showId: string }> }) {
  const { showId } = await params;
  return <ProducerShowDetail showId={showId} />;
}

import type { Metadata } from "next";
import { ProducerShowList } from "@/components/shows/manage/producer-show-list";

export const metadata: Metadata = { title: "무료 공연 관리" };

export default async function ProducerShowsPage({ searchParams }: {
  readonly searchParams: Promise<{ create?: string }>;
}) {
  const { create } = await searchParams;
  return <ProducerShowList key={create === "1" ? "create" : "list"} autoOpenCreate={create === "1"} />;
}

import type { Metadata } from "next";
import { PostingPicker } from "@/components/auditions/posting-picker";
import { performanceId } from "@/features/auditions/types";

export const metadata: Metadata = {
  title: "공고 관리",
};

export default async function PostingPickerPage({
  params,
  searchParams,
}: {
  params: Promise<{ performanceId: string }>;
  searchParams: Promise<{ createPosting?: string }>;
}) {
  const { performanceId: raw } = await params;
  const { createPosting } = await searchParams;
  return <PostingPicker performanceId={performanceId(raw)} autoOpenCreate={createPosting === "1"} />;
}

import type { Metadata } from "next";
import { PostingPicker } from "@/components/screening/posting-picker";
import { performanceId } from "@/features/screening/types";

export const metadata: Metadata = {
  title: "공고 선택",
};

export default async function PostingPickerPage({
  params,
}: {
  params: Promise<{ performanceId: string }>;
}) {
  const { performanceId: raw } = await params;
  return <PostingPicker performanceId={performanceId(raw)} />;
}

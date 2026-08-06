import type { Metadata } from "next";
import { PublicPostingDetail } from "@/components/applications/public-posting-detail";
import { PublicPostingUnavailable } from "@/components/applications/public-posting-status";
import { publicPostingById } from "@/features/applications/public-posting";

export async function generateMetadata({ params }: { params: Promise<{ postingId: string }> }): Promise<Metadata> {
  const { postingId } = await params;
  const posting = publicPostingById(postingId);
  return { title: posting ? `${posting.performanceTitle} ${posting.title}` : "공고를 찾을 수 없어요" };
}

export default async function PublicPostingPage({ params }: { params: Promise<{ postingId: string }> }) {
  const { postingId } = await params;
  const posting = publicPostingById(postingId);
  return posting ? <PublicPostingDetail posting={posting} /> : <PublicPostingUnavailable />;
}

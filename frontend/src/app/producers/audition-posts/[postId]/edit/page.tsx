import type { Metadata } from "next";
import { ProducerAuditionPostEdit } from "@/components/audition-posts/manage/producer-audition-post-edit";

export const metadata: Metadata = { title: "공고 수정" };

export default async function ProducerAuditionPostEditPage({ params }: {
  readonly params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  return <ProducerAuditionPostEdit postId={postId} />;
}

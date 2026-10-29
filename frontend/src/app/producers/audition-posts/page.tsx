import type { Metadata } from "next";
import { ProducerAuditionPostList } from "@/components/audition-posts/manage/producer-audition-post-list";

export const metadata: Metadata = { title: "내 오디션 공고" };

export default function ProducerAuditionPostsPage() {
  return <ProducerAuditionPostList />;
}

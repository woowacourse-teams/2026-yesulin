import type { Metadata } from "next";
import { ProducerAuditionPostList } from "@/components/audition-posts/manage/producer-audition-post-list";

export const metadata: Metadata = { title: "공고 게시" };

export default function ProducerAuditionPostsPage() {
  return <ProducerAuditionPostList />;
}

import type { Metadata } from "next";
import { ProducerAuditionPostNew } from "@/components/audition-posts/manage/producer-audition-post-new";

export const metadata: Metadata = { title: "공고 올리기" };

export default function ProducerAuditionPostNewPage() {
  return <ProducerAuditionPostNew />;
}

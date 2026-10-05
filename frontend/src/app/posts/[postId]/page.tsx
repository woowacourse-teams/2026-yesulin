import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AuditionPostRoute } from "@/components/audition-posts/audition-post-detail";
import { formatDeadline } from "@/features/audition-posts/format";
import { auditionPostForServer } from "@/features/audition-posts/server";
import { auditionPostRoutes } from "@/features/audition-posts/types";

const POST_ID = /^[1-9][0-9]{0,17}$/;

export async function generateMetadata({ params }: { params: Promise<{ postId: string }> }): Promise<Metadata> {
  const { postId } = await params;
  const post = POST_ID.test(postId) ? await auditionPostForServer(postId) : null;
  if (!post) return { title: "공고", robots: { index: false, follow: true } };
  const canonical = auditionPostRoutes.detail(postId);
  const description = [post.category, post.authorName, `마감 ${formatDeadline(post)}`].filter(Boolean).join(" · ");
  return {
    title: post.title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "article",
      locale: "ko_KR",
      url: canonical,
      siteName: "예술in",
      title: post.title,
      description,
    },
  };
}

export default async function AuditionPostPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  if (!POST_ID.test(postId)) notFound();
  const post = await auditionPostForServer(postId);
  return <AuditionPostRoute postId={postId} initialPost={post} />;
}

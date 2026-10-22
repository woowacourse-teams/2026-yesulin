import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AuditionPostRoute } from "@/components/audition-posts/audition-post-detail";
import { auditionPostForServer, recordAuditionPostRedirect } from "@/features/audition-posts/server";
import { auditionPostRoutes } from "@/features/audition-posts/types";
import { auditionPostMetadata } from "@/features/seo/audition-metadata";

const POST_ID = /^[1-9][0-9]{0,17}$/;

export async function generateMetadata({ params }: { params: Promise<{ postId: string }> }): Promise<Metadata> {
  const { postId } = await params;
  if (!POST_ID.test(postId)) notFound();
  const found = await auditionPostForServer(postId);
  if (found.kind === "missing") notFound();
  const canonical = auditionPostRoutes.detail(postId);
  if (found.kind === "client-only") return { title: "공고", alternates: { canonical } };
  if (found.kind === "hidden") return { title: "공고", robots: { index: false, follow: true } };
  return auditionPostMetadata(found.post);
}

export default async function AuditionPostPage({ params }: { params: Promise<{ postId: string }> }) {
  const { postId } = await params;
  if (!POST_ID.test(postId)) notFound();
  const found = await auditionPostForServer(postId);
  if (found.kind === "missing") notFound();
  // 숨긴 공고는 이미 공유된 링크가 끊기지 않도록 원문 공고로 보내고, 조회수와 따로 이동 수를 센다.
  if (found.kind === "hidden") {
    await recordAuditionPostRedirect(postId);
    redirect(found.originalUrl);
  }
  return <AuditionPostRoute postId={postId} initialPost={found.kind === "published" ? found.post : null} />;
}

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AuditionPostRoute } from "@/components/audition-posts/audition-post-detail";
import { OpenChatLinkVisit } from "@/components/audition-posts/openchat-link-visit";
import { OPENCHAT_SOURCE, readOpenChatReminder, REMINDER_CAMPAIGN_PARAM } from "@/features/audition-posts/openchat-reminder-tag";
import { openChatPostKey } from "@/features/audition-posts/openchat-visit";
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

export default async function AuditionPostPage({ params, searchParams }: {
  params: Promise<{ postId: string }>;
  searchParams: Promise<{ src?: string | string[]; [REMINDER_CAMPAIGN_PARAM]?: string | string[] }>;
}) {
  const { postId } = await params;
  const { src, [REMINDER_CAMPAIGN_PARAM]: campaign } = await searchParams;
  const fromOpenChat = src === OPENCHAT_SOURCE;
  const reminderCampaign = readOpenChatReminder(src, campaign);
  if (!POST_ID.test(postId)) notFound();
  const found = await auditionPostForServer(postId);
  if (found.kind === "missing") notFound();
  // 숨긴 공고는 이미 공유된 링크가 끊기지 않도록 원문 공고로 보내고, 조회수와 따로 이동 수를 센다.
  if (found.kind === "hidden") {
    if (fromOpenChat) {
      return <OpenChatLinkVisit kind="post" id={postId} dedupKey={openChatPostKey(postId, found.originalUrl)} destination={auditionPostRoutes.detail(postId)} />;
    }
    await recordAuditionPostRedirect(postId);
    redirect(found.originalUrl);
  }
  const initialPost = (found.kind === "published" && found.post) || null;
  return (
    <>
      {fromOpenChat && <OpenChatLinkVisit key={reminderCampaign} kind="post" id={postId} dedupKey={openChatPostKey(postId, initialPost?.sourceUrl ?? null)} />}
      <AuditionPostRoute key={`${postId}:${reminderCampaign ?? ""}`} postId={postId}
        initialPost={initialPost} reminderCampaign={reminderCampaign} />
    </>
  );
}

import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { OpenChatLinkVisit } from "@/components/audition-posts/openchat-link-visit";
import { OPENCHAT_SOURCE } from "@/features/audition-posts/openchat-visit";

export const metadata: Metadata = {
  title: "공고",
  robots: { index: false, follow: false },
};

/** 가져오기에 실패해 Slack이 OTR 경유 링크를 보낸 경우에도 브라우저 방문을 먼저 기록한다. */
export default async function OtrNoticePage({ searchParams }: {
  readonly searchParams: Promise<{ vid?: string | string[]; src?: string | string[] }>;
}) {
  const { vid, src } = await searchParams;
  if (typeof vid !== "string" || !/^[0-9]{1,30}$/.test(vid)) notFound();
  const destination = `/api/v1/otr?vid=${encodeURIComponent(vid)}`;
  if (src !== OPENCHAT_SOURCE) redirect(destination);
  return <OpenChatLinkVisit kind="otr" id={vid} destination={destination} />;
}

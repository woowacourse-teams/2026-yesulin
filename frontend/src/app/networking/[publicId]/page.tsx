import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EventScreen } from "@/components/events/event-screen";
import { ContentState } from "@/components/ui/content-state";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "명함 프로필", robots: { index: false, follow: false } };

export default async function NetworkingPendingPage({ params, searchParams }: {
  readonly params: Promise<{ publicId: string }>;
  readonly searchParams: Promise<{ state?: string }>;
}) {
  const { publicId } = await params;
  const { state } = await searchParams;
  if (state === "missing") notFound();
  const unavailable = state === "unavailable";
  return <EventScreen>
    <ContentState headingLevel={1}
      title={unavailable ? "프로필 연결을 확인하지 못했어요" : "프로필을 준비 중이에요"}
      description={unavailable ? "잠시 후 다시 확인해 주세요." : "아직 프로필이 연결되지 않았어요. 연결이 완료되면 같은 명함의 QR로 프로필을 볼 수 있어요."}
      action={<a href={`/events/cards/${encodeURIComponent(publicId)}`} className="rounded-control border border-border px-4 py-3 text-sm font-semibold">다시 확인</a>} />
  </EventScreen>;
}

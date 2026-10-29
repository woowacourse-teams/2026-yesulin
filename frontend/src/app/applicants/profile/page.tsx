import type { Metadata } from "next";
import { ApplicantProfileWorkspace } from "@/components/applicants/profile-workspace";

export const metadata: Metadata = { title: "내 프로필" };

/** `?tab=actor-page`로 열면 배우 페이지 설정 탭부터 보인다. */
export default async function ApplicantProfilePage({ searchParams }: { readonly searchParams: Promise<{ readonly tab?: string | string[]; readonly eventId?: string | string[] }> }) {
  const { tab, eventId: rawEventId } = await searchParams;
  const eventId = typeof rawEventId === "string" && /^[1-9]\d*$/.test(rawEventId) && Number.isSafeInteger(Number(rawEventId)) ? Number(rawEventId) : undefined;
  return <ApplicantProfileWorkspace eventId={eventId} initialTab={tab === "actor-page" ? "ACTOR_PAGE" : undefined} />;
}

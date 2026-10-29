import type { Metadata } from "next";
import { ApplicantProfileWorkspace } from "@/components/applicants/profile-workspace";

export const metadata: Metadata = { title: "내 프로필" };

/** `?tab=actor-page`로 열면 배우 페이지 설정 탭부터 보인다. */
export default async function ApplicantProfilePage({ searchParams }: { readonly searchParams: Promise<{ readonly tab?: string | string[] }> }) {
  const { tab } = await searchParams;
  return <ApplicantProfileWorkspace initialTab={tab === "actor-page" ? "ACTOR_PAGE" : undefined} />;
}

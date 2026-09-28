import type { Metadata } from "next";
import { OtrAuditionList } from "@/components/otr-auditions/otr-audition-list";

export const metadata: Metadata = { title: "오디션 공고 관리" };

export default async function OtrAuditionSelectedPage({ params }: {
  readonly params: Promise<{ otrAuditionId: string }>;
}) {
  const { otrAuditionId } = await params;
  return <OtrAuditionList selectedId={otrAuditionId} />;
}

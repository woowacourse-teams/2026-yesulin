import type { Metadata } from "next";
import { OtrAuditionList } from "@/components/otr-auditions/otr-audition-list";

export const metadata: Metadata = { title: "지원서 접수·심사" };

export default async function OtrAuditionSelectedPage({ params }: {
  readonly params: Promise<{ otrAuditionId: string }>;
}) {
  const { otrAuditionId } = await params;
  return <OtrAuditionList selectedId={otrAuditionId} />;
}

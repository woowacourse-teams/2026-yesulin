import type { Metadata } from "next";
import { OtrScreeningRolePicker } from "@/components/otr-auditions/otr-screening-role-picker";

export const metadata: Metadata = { title: "OTR 배역별 심사 관리" };

export default async function Page({ params }: { readonly params: Promise<{ otrAuditionId: string }> }) {
  const { otrAuditionId } = await params;
  return <OtrScreeningRolePicker auditionId={otrAuditionId} />;
}

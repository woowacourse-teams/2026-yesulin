import type { Metadata } from "next";
import { MswProvider } from "@/components/mocks/msw-provider";
import { OtrApplicationPage } from "@/components/otr-auditions/otr-application-page";

export const metadata: Metadata = { title: "OTR 공고 지원", robots: { index: false, follow: false } };

export default async function Page({ params }: { readonly params: Promise<{ otrAuditionId: string }> }) {
  const { otrAuditionId } = await params;
  return <MswProvider><OtrApplicationPage auditionId={otrAuditionId} /></MswProvider>;
}

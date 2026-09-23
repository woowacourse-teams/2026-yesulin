import type { Metadata } from "next";
import { MswProvider } from "@/components/mocks/msw-provider";
import { OtrApplicationPage } from "@/components/otr-auditions/otr-application-page";
import { isApplicationWriteRouteKey } from "@/features/applications/routes";

export const metadata: Metadata = { title: "OTR 공고 지원", robots: { index: false, follow: false } };

export default async function Page({ params, searchParams }: {
  readonly params: Promise<{ otrAuditionId: string }>;
  readonly searchParams: Promise<{ step?: string | string[] }>;
}) {
  const [{ otrAuditionId }, query] = await Promise.all([params, searchParams]);
  const requestedStep = typeof query.step === "string" ? query.step : "";
  const initialRoute = isApplicationWriteRouteKey(requestedStep) ? requestedStep : "basic";
  return <MswProvider><OtrApplicationPage auditionId={otrAuditionId} initialRoute={initialRoute} /></MswProvider>;
}

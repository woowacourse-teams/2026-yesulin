import type { Metadata } from "next";
import { PublicApplicationLookup } from "@/components/applications/public-application-lookup";
import { ToastProvider } from "@/components/auditions/toast";
import { MswProvider } from "@/components/mocks/msw-provider";

export const metadata: Metadata = { title: "지원 내역 조회", robots: { index: false, follow: false } };

export default function ApplicationLookupPage() {
  return <MswProvider><ToastProvider><PublicApplicationLookup /></ToastProvider></MswProvider>;
}

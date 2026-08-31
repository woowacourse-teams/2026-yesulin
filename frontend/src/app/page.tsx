import type { Metadata } from "next";
import { MarketingLanding } from "@/components/landing/marketing-landing";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return <MarketingLanding audience="applicant" />;
}

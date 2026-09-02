import type { Metadata } from "next";
import { MarketingLanding } from "@/components/landing/marketing-landing";
import { JsonLd } from "@/components/seo/json-ld";
import { homeStructuredData } from "@/features/seo/structured-data";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default function HomePage() {
  return (
    <>
      <JsonLd id="home-structured-data" data={homeStructuredData} />
      <MarketingLanding audience="applicant" />
    </>
  );
}

import type { Metadata } from "next";
import { ApplicantApplicationDetailView } from "@/components/applicants/application-detail";
import { applicationId as toApplicationId } from "@/features/auditions/types";

export const metadata: Metadata = { title: "지원서 상세" };

export default async function ApplicantApplicationPage({ params }: { readonly params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  return <ApplicantApplicationDetailView applicationId={toApplicationId(applicationId)} />;
}

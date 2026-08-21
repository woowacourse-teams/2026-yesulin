import type { Metadata } from "next";
import { ApplicantSubmissionDetailView } from "@/components/applicants/submission-detail";
import { submissionId as toSubmissionId } from "@/features/auditions/types";

export const metadata: Metadata = { title: "지원서 상세" };

export default async function ApplicantSubmissionPage({ params }: { readonly params: Promise<{ submissionId: string }> }) {
  const { submissionId } = await params;
  return <ApplicantSubmissionDetailView submissionId={toSubmissionId(submissionId)} />;
}

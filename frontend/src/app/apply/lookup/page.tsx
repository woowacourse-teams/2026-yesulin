import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "지원 내역 조회", robots: { index: false, follow: false } };

export default function SubmissionLookupPage() {
  redirect("/login?returnTo=/applicants/submissions");
}

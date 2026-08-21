import type { Metadata } from "next";
import { ApplicantSubmissionList } from "@/components/applicants/submission-list";

export const metadata: Metadata = { title: "내 지원서" };

export default function ApplicantSubmissionsPage() {
  return <ApplicantSubmissionList />;
}

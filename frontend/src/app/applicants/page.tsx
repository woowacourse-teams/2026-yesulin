import type { Metadata } from "next";
import { ApplicantDashboard } from "@/components/applicants/applicant-dashboard";

export const metadata: Metadata = { title: "지원자 홈" };

export default function ApplicantHomePage() {
  return <ApplicantDashboard />;
}

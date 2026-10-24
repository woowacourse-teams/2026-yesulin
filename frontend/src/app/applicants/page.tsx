import type { Metadata } from "next";
import { ApplicantDashboard } from "@/components/applicants/applicant-dashboard";

export const metadata: Metadata = { title: "마이페이지" };

export default function ApplicantHomePage() {
  return <ApplicantDashboard />;
}

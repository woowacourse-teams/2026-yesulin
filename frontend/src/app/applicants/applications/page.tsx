import type { Metadata } from "next";
import { ApplicantApplicationList } from "@/components/applicants/application-list";

export const metadata: Metadata = { title: "내 지원서" };

export default function ApplicantApplicationsPage() {
  return <ApplicantApplicationList />;
}

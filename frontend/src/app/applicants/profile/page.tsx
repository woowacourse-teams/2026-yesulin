import type { Metadata } from "next";
import { ApplicantProfileWorkspace } from "@/components/applicants/profile-workspace";

export const metadata: Metadata = { title: "내 프로필" };

export default function ApplicantProfilePage() {
  return <ApplicantProfileWorkspace />;
}

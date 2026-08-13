import type { Metadata } from "next";
import { ApplicantShell } from "@/components/applicants/applicant-shell";
import { ToastProvider } from "@/components/auditions/toast";
import { MswProvider } from "@/components/mocks/msw-provider";
import { SessionGuard } from "@/components/auth/session-guard";

export const metadata: Metadata = {
  title: { default: "지원자 홈", template: "%s | 예술인" },
  robots: { index: false, follow: false },
};

export default function ApplicantsLayout({ children }: { readonly children: React.ReactNode }) {
  return <MswProvider><SessionGuard role="applicant"><ToastProvider><ApplicantShell>{children}</ApplicantShell></ToastProvider></SessionGuard></MswProvider>;
}

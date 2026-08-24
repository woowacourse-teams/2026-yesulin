import type { Metadata } from "next";
import { ApplicantShell } from "@/components/applicants/applicant-shell";
import { ApplicantAuthGuard } from "@/components/auth/applicant-auth-guard";
import { ToastProvider } from "@/components/auditions/toast";
import { MswProvider } from "@/components/mocks/msw-provider";

export const metadata: Metadata = {
  title: { default: "배우 홈", template: "%s | 예술in" },
  robots: { index: false, follow: false },
};

export default function ApplicantsLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <MswProvider>
      <ToastProvider>
        <ApplicantAuthGuard>
          <ApplicantShell>{children}</ApplicantShell>
        </ApplicantAuthGuard>
      </ToastProvider>
    </MswProvider>
  );
}

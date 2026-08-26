import type { Metadata } from "next";
import { MswProvider } from "@/components/mocks/msw-provider";
import { ProducerShell } from "@/components/producers/producer-shell";
import { ProducerAccessGate } from "@/components/producers/producer-access-gate";
import { ToastProvider } from "@/components/auditions/toast";
import { UnauthorizedRedirectHandler } from "@/components/auth/unauthorized-redirect-handler";
import { ProducerAuthGuard } from "@/components/auth/producer-auth-guard";

export const metadata: Metadata = {
  title: "기획사/제작사 관리자",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProducersLayout({ children }: { children: React.ReactNode }) {
  return (
    <MswProvider>
      <ToastProvider>
        <UnauthorizedRedirectHandler />
        <ProducerAuthGuard>
          <ProducerShell><ProducerAccessGate>{children}</ProducerAccessGate></ProducerShell>
        </ProducerAuthGuard>
      </ToastProvider>
    </MswProvider>
  );
}

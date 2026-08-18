import type { Metadata } from "next";
import { MswProvider } from "@/components/mocks/msw-provider";
import { ProducerShell } from "@/components/producers/producer-shell";
import { ProducerAccessGate } from "@/components/producers/producer-access-gate";
import { ToastProvider } from "@/components/auditions/toast";

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
        <ProducerShell><ProducerAccessGate>{children}</ProducerAccessGate></ProducerShell>
      </ToastProvider>
    </MswProvider>
  );
}

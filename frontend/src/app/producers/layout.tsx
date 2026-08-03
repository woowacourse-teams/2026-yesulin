import type { Metadata } from "next";
import { MswProvider } from "@/components/mocks/msw-provider";
import { ProducerShell } from "@/components/producers/producer-shell";

export const metadata: Metadata = {
  title: "공연사 관리자",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProducersLayout({ children }: { children: React.ReactNode }) {
  return (
    <MswProvider>
      <ProducerShell>{children}</ProducerShell>
    </MswProvider>
  );
}

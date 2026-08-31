import type { Metadata } from "next";
import { MswProvider } from "@/components/mocks/msw-provider";

export const metadata: Metadata = {
  title: "운영 대시보드",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { readonly children: React.ReactNode }) {
  return (
    <MswProvider>
      <div className="min-h-dvh bg-neutral-50">{children}</div>
    </MswProvider>
  );
}

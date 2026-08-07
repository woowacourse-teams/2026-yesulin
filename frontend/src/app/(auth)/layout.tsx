import type { Metadata } from "next";
import { ToastProvider } from "@/components/auditions/toast";
import { MswProvider } from "@/components/mocks/msw-provider";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <MswProvider><ToastProvider>{children}</ToastProvider></MswProvider>;
}

"use client";

import { usePathname } from "next/navigation";
import { useAuthSession } from "@/components/auth/auth-session";
import { auditionRoutes } from "@/features/auditions/routes";
import { ProducerEmailVerification } from "./producer-email-verification";

export function ProducerAccessGate({ children }: { readonly children: React.ReactNode }) {
  const pathname = usePathname();
  const { session } = useAuthSession();
  if (pathname === auditionRoutes.account) return children;
  if (session?.role !== "PRODUCER") return children;
  if (session.producerStatus !== "PENDING") return children;
  return <ProducerEmailVerification />;
}

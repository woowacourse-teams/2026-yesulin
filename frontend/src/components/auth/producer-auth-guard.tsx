"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "./auth-session";

export function ProducerAuthGuard({ children }: { readonly children: React.ReactNode }) {
  const router = useRouter();
  const { session, sessionReady, serverSessionEnabled } = useAuthSession();
  const producerAuthenticated = session?.role === "PRODUCER";

  useEffect(() => {
    if (serverSessionEnabled && sessionReady && !producerAuthenticated) {
      router.replace("/");
    }
  }, [producerAuthenticated, router, serverSessionEnabled, sessionReady]);

  if (!serverSessionEnabled) return children;
  if (sessionReady && producerAuthenticated) return children;
  return null;
}

"use client";

import { useEffect, useRef } from "react";
import { useAuthSession } from "@/components/auth/auth-session";
import { ANALYTICS_READY_EVENT } from "@/features/analytics/consent";
import { refreshProductContext, startProductAnalytics } from "@/features/analytics/product-analytics";

export function ProductAnalyticsProvider() {
  const { session, sessionReady } = useAuthSession();
  const previous = useRef<string | null | undefined>(undefined);
  useEffect(() => {
    if (!sessionReady) return;
    const credential = session?.credential ?? null;
    if (previous.current !== undefined && previous.current !== credential) refreshProductContext();
    previous.current = credential;
    void startProductAnalytics().then(ready => {
      if (ready) window.dispatchEvent(new Event(ANALYTICS_READY_EVENT));
    });
  }, [session?.credential, sessionReady]);
  return null;
}

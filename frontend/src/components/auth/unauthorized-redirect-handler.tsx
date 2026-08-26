"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AUTH_UNAUTHORIZED_EVENT } from "@/features/auth/unauthorized";
import { useAuthSession } from "./auth-session";

export function UnauthorizedRedirectHandler() {
  const pathname = usePathname();
  const router = useRouter();
  const { setSession } = useAuthSession();
  const redirecting = useRef(false);

  useEffect(() => {
    redirecting.current = false;
  }, [pathname]);

  useEffect(() => {
    const redirectToLogin = () => {
      setSession(null);
      if (redirecting.current || pathname === "/login") return;

      redirecting.current = true;
      const returnTo = `${window.location.pathname}${window.location.search}`;
      router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    };

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, redirectToLogin);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, redirectToLogin);
  }, [pathname, router, setSession]);

  return null;
}

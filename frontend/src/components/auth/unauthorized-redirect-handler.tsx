"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { PRODUCER_LOGIN_PATH } from "@/features/auth/producer-navigation";
import { AUTH_UNAUTHORIZED_EVENT } from "@/features/auth/unauthorized";
import { useAuthSession } from "./auth-session";

const LOGIN_PATHS = ["/login", PRODUCER_LOGIN_PATH];

export function UnauthorizedRedirectHandler() {
  const pathname = usePathname();
  const router = useRouter();
  const { session, setSession } = useAuthSession();
  const role = session?.role;
  const redirecting = useRef(false);

  useEffect(() => {
    redirecting.current = false;
  }, [pathname]);

  useEffect(() => {
    const redirectToLogin = () => {
      setSession(null);
      if (redirecting.current || LOGIN_PATHS.includes(pathname)) return;

      redirecting.current = true;
      const returnTo = `${window.location.pathname}${window.location.search}`;
      const loginPath = role === "PRODUCER" ? PRODUCER_LOGIN_PATH : "/login";
      router.replace(`${loginPath}?returnTo=${encodeURIComponent(returnTo)}`);
    };

    window.addEventListener(AUTH_UNAUTHORIZED_EVENT, redirectToLogin);
    return () => window.removeEventListener(AUTH_UNAUTHORIZED_EVENT, redirectToLogin);
  }, [pathname, role, router, setSession]);

  return null;
}

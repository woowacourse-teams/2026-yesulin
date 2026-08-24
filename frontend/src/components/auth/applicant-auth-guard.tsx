"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuthSession } from "./auth-session";

export function ApplicantAuthGuard({ children }: { readonly children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { session, sessionReady, serverSessionEnabled } = useAuthSession();
  const applicantAuthenticated = session?.role === "APPLICANT";

  useEffect(() => {
    if (serverSessionEnabled && sessionReady && !applicantAuthenticated) {
      router.replace(`/login?returnTo=${encodeURIComponent(pathname)}`);
    }
  }, [applicantAuthenticated, pathname, router, serverSessionEnabled, sessionReady]);

  if (!serverSessionEnabled) return children;
  if (sessionReady && applicantAuthenticated) return children;

  return (
    <main className="grid min-h-screen place-items-center bg-surface px-6">
      <p role="status" className="text-sm font-medium text-muted">
        {sessionReady ? "로그인 화면으로 이동하고 있어요." : "로그인 상태를 확인하고 있어요."}
      </p>
    </main>
  );
}

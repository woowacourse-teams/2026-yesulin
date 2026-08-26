"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthSession } from "@/components/auth/auth-session";
import { consumeSocialLoginReturnTo } from "@/features/auth/social-login-return-to";
import { loginAttributionFor, trackLoginSuccess } from "@/features/analytics/events";

export default function SocialLoginCompletePage() {
  const router = useRouter();
  const { session, sessionReady } = useAuthSession();

  useEffect(() => {
    if (!sessionReady) return;
    if (session?.role === "APPLICANT") {
      const returnTo = consumeSocialLoginReturnTo();
      trackLoginSuccess(returnTo, loginAttributionFor(returnTo, "applicant"));
      router.replace(returnTo);
      return;
    }
    router.replace("/login");
  }, [router, session, sessionReady]);

  return (
    <main className="grid min-h-screen place-items-center bg-surface px-6">
      <p role="status" className="text-sm font-medium text-muted">
        로그인 결과를 확인하고 이전 화면으로 돌아가고 있어요.
      </p>
    </main>
  );
}

"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { frontendEnvironment } from "@/config/environment";
import { loginAttributionFor, trackLoginAttempt, trackLoginSuccess } from "@/features/analytics/events";
import { DEFAULT_APPLICANT_LOGIN_RETURN_TO, rememberSocialLoginReturnTo } from "@/features/auth/social-login-return-to";
import { safeAuthReturnTo } from "@/features/auth/return-to";
import { useAuthSession, type SocialProvider } from "./auth-session";
import { SocialButtons } from "./social-buttons";

const PROVIDER_LABELS = { kakao: "카카오", naver: "네이버", google: "Google" };

export function SocialLogin({ returnTo, compact = false, onSuccess }: {
  readonly returnTo?: string;
  readonly onSuccess?: () => void;
  readonly compact?: boolean;
}) {
  const router = useRouter();
  const { setSession } = useAuthSession();
  const busy = useRef(false);
  const [pendingProvider, setPendingProvider] = useState<SocialProvider>();
  const [error, setError] = useState("");
  const destination = safeAuthReturnTo(returnTo) ?? DEFAULT_APPLICANT_LOGIN_RETURN_TO;
  const attribution = loginAttributionFor(destination, "applicant");

  async function mockLogin(provider: SocialProvider) {
    const { mockApplicantLogin } = await import("@/mocks/auth-handlers");
    const member = mockApplicantLogin();
    setSession({ credential: `member-${member.memberId}`, role: "APPLICANT", displayName: `${PROVIDER_LABELS[provider]} 배우`, socialProvider: provider });
    trackLoginSuccess(destination, attribution);
    onSuccess?.();
    router.push(destination);
  }

  async function authorize(provider: SocialProvider) {
    trackLoginAttempt(provider, attribution);
    if (frontendEnvironment.socialLoginEnabled || !frontendEnvironment.apiMockingEnabled) {
      rememberSocialLoginReturnTo(destination);
      window.location.assign(`/oauth2/authorization/${provider}`);
      return;
    }
    await mockLogin(provider);
  }

  async function select(provider: SocialProvider) {
    if (busy.current) return;
    busy.current = true;
    setPendingProvider(provider);
    setError("");
    try { await authorize(provider); }
    catch {
      busy.current = false;
      setPendingProvider(undefined);
      setError("로그인을 시작하지 못했어요. 다시 눌러 주세요.");
    }
  }

  return <div className="social-login-actions">
    <SocialButtons compact={compact} pendingProvider={pendingProvider} onSelect={(provider) => void select(provider)} />
    {error && <p role="alert" className="mt-2 text-sm text-fail">{error}</p>}
  </div>;
}

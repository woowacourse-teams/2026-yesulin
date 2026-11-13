"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/auditions/toast";
import { LocalActorLogin } from "./local-actor-login";
import { SocialButtons } from "./social-buttons";
import { DEFAULT_APPLICANT_LOGIN_RETURN_TO, rememberSocialLoginReturnTo } from "@/features/auth/social-login-return-to";
import { frontendEnvironment } from "@/config/environment";
import { type SocialProvider, useAuthSession } from "./auth-session";
import {
  loginAttributionFor,
  trackLoginAttempt,
  trackLoginPageView,
  trackLoginSuccess,
} from "@/features/analytics/events";

const mockingDisabled = !frontendEnvironment.apiMockingEnabled;
const realSocialLoginEnabled = frontendEnvironment.socialLoginEnabled;

const PROVIDER_LABELS: Record<SocialProvider, string> = {
  kakao: "카카오",
  naver: "네이버",
  google: "Google",
};

export function LoginForm({ returnTo, applicationFlow = false, localActorLogin = false }: { readonly localActorLogin?: boolean; readonly returnTo?: string; readonly applicationFlow?: boolean }) {
  const toast = useToast();
  const router = useRouter();
  const { setSession } = useAuthSession();
  const [pendingProvider, setPendingProvider] = useState<SocialProvider>();
  const [pageAttribution] = useState(() => loginAttributionFor(returnTo, applicationFlow ? "applicant" : "unknown"));

  useEffect(() => {
    trackLoginPageView(pageAttribution);
  }, [pageAttribution]);

  async function handleSocialLogin(provider: SocialProvider) {
    setPendingProvider(provider);
    const applicantAttribution = loginAttributionFor(returnTo, "applicant");
    trackLoginAttempt(provider, applicantAttribution);

    if (realSocialLoginEnabled || mockingDisabled) {
      rememberSocialLoginReturnTo(returnTo);
      window.location.assign(`/oauth2/authorization/${provider}`);
      return;
    }

    await new Promise((resolve) => window.setTimeout(resolve, 240));
    const { mockApplicantLogin } = await import("@/mocks/auth-handlers");
    const mockApplicant = mockApplicantLogin();
    setSession({
      credential: `member-${mockApplicant.memberId}`,
      role: "APPLICANT",
      displayName: `${PROVIDER_LABELS[provider]} 회원`,
      socialProvider: provider,
    });
    const destination = returnTo ?? DEFAULT_APPLICANT_LOGIN_RETURN_TO;
    trackLoginSuccess(destination, applicantAttribution);
    toast(applicationFlow ? "로그인했습니다. 지원서 검토 화면으로 돌아갑니다." : "로그인했습니다.", { type: "success" });
    router.push(destination);
  }

  return (
    <div className="space-y-5">
      <SocialButtons pendingProvider={pendingProvider} onSelect={(provider) => void handleSocialLogin(provider)} />
      {localActorLogin && <LocalActorLogin returnTo={returnTo} />}
    </div>
  );
}

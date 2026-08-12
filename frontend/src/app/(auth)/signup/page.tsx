import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { ApplicationAuthContextCard } from "@/components/auth/application-auth-context";
import { applicationAuthContextForServer } from "@/features/auth/application-auth-context-server";
import { authSuccessReturnTo, authSwitchHref, safeAuthReturnTo } from "@/features/auth/return-to";

export const metadata: Metadata = { title: "회원가입" };

export default async function SignupPage({ searchParams }: { readonly searchParams: Promise<{ role?: string; claim?: string; returnTo?: string }> }) {
  const { role, claim, returnTo } = await searchParams;
  const safeReturnTo = safeAuthReturnTo(returnTo);
  const applicationContext = await applicationAuthContextForServer(safeReturnTo);
  const loginHref = authSwitchHref("/login", safeReturnTo);
  return (
    <AuthShell
      intent={applicationContext ? "application" : "default"}
      title={applicationContext ? "지원자 계정을 만들고 계속할게요" : "계정 만들기"}
      description={applicationContext ? "가입을 완료하면 작성하던 지원서의 최종 검토 화면으로 돌아갑니다." : "사용할 계정 유형과 기본 정보를 입력해 주세요."}
      footer={<><span>이미 계정이 있나요?</span>{" "}<Link href={loginHref} className="font-semibold text-brand hover:text-brand-strong hover:underline">{applicationContext ? "로그인하고 계속" : "로그인"}</Link></>}
    >
      {applicationContext ? <ApplicationAuthContextCard context={applicationContext} /> : null}
      <SignupForm initialRole={applicationContext ? "applicant" : role === "producer" ? "producer" : "applicant"} profileClaimToken={claim} returnTo={authSuccessReturnTo(safeReturnTo)} applicationFlow={Boolean(applicationContext)} />
    </AuthShell>
  );
}

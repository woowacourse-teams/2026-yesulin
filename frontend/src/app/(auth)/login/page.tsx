import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { ApplicationAuthContextCard } from "@/components/auth/application-auth-context";
import { applicationAuthContextForServer } from "@/features/auth/application-auth-context-server";
import { authSuccessReturnTo, authSwitchHref, safeAuthReturnTo } from "@/features/auth/return-to";

export const metadata: Metadata = { title: "로그인" };

export default async function LoginPage({ searchParams }: { readonly searchParams: Promise<{ returnTo?: string }> }) {
  const { returnTo } = await searchParams;
  const safeReturnTo = safeAuthReturnTo(returnTo);
  const applicationContext = await applicationAuthContextForServer(safeReturnTo);
  const signupHref = authSwitchHref("/signup", safeReturnTo);
  return (
    <AuthShell
      intent={applicationContext ? "application" : "default"}
      title={applicationContext ? "지원서 제출을 계속할게요" : "다시 만나 반가워요"}
      description={applicationContext ? "지원자 계정으로 인증하면 작성하던 지원서의 최종 검토 화면으로 돌아갑니다." : "계정 유형을 선택하고 이메일로 로그인해 주세요."}
      footer={<><span>{applicationContext ? "지원자 계정이 없나요?" : "아직 계정이 없나요?"}</span>{" "}<Link href={signupHref} className="font-semibold text-brand hover:text-brand-strong hover:underline">{applicationContext ? "회원가입하고 계속" : "회원가입"}</Link></>}
    >
      {applicationContext ? <ApplicationAuthContextCard context={applicationContext} /> : null}
      <LoginForm returnTo={authSuccessReturnTo(safeReturnTo)} applicationFlow={Boolean(applicationContext)} />
    </AuthShell>
  );
}

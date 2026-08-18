import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { ApplicationAuthContextCard } from "@/components/auth/application-auth-context";
import { applicationAuthContextForServer } from "@/features/auth/application-auth-context-server";
import { authSuccessReturnTo, safeAuthReturnTo } from "@/features/auth/return-to";

export const metadata: Metadata = { title: { absolute: "예술in" } };

export default async function LoginPage({ searchParams }: { readonly searchParams: Promise<{ returnTo?: string }> }) {
  const { returnTo } = await searchParams;
  const safeReturnTo = safeAuthReturnTo(returnTo);
  const applicationContext = await applicationAuthContextForServer(safeReturnTo);
  return (
    <AuthShell
      intent={applicationContext ? "application" : "default"}
      title={applicationContext ? "지원서 제출을 계속할게요" : "다시 만나 반가워요"}
      description={applicationContext
        ? "소셜 계정으로 로그인하면 작성하던 지원서의 최종 검토 화면으로 돌아갑니다."
        : <span className="sm:whitespace-nowrap">로그인하고 지원서 제출부터 캐스팅 관리까지 편리하게 이어가세요.</span>}
      footer={applicationContext
        ? <span>처음 이용해도 소셜 로그인과 함께 배우 계정이 자동으로 만들어집니다.</span>
        : <><span>기획사/제작사 계정이 없나요?</span>{" "}<Link href="/signup" className="font-semibold text-brand hover:text-brand-strong hover:underline">기획사/제작사 회원가입</Link></>}
    >
      {applicationContext ? <ApplicationAuthContextCard context={applicationContext} /> : null}
      <LoginForm returnTo={authSuccessReturnTo(safeReturnTo)} applicationFlow={Boolean(applicationContext)} />
    </AuthShell>
  );
}

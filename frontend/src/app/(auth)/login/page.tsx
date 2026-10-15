import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { ApplicationAuthContextCard } from "@/components/auth/application-auth-context";
import { applicationAuthContextForServer } from "@/features/auth/application-auth-context-server";
import { authSuccessReturnTo, safeAuthReturnTo } from "@/features/auth/return-to";

export const metadata: Metadata = { title: { absolute: "예술in" } };

export default async function LoginPage({ searchParams }: {
  readonly searchParams: Promise<{ returnTo?: string; socialLoginError?: string }>;
}) {
  const { returnTo, socialLoginError } = await searchParams;
  const safeReturnTo = safeAuthReturnTo(returnTo);
  const applicationContext = await applicationAuthContextForServer(safeReturnTo);
  return (
    <AuthShell
      intent={applicationContext ? "application" : "default"}
      fitViewport={!applicationContext}
      title={applicationContext ? "지원서 제출을 위한 로그인" : "로그인"}
      description={applicationContext
        ? "소셜 계정으로 로그인하면 작성하던 지원서의 최종 검토 화면으로 돌아갑니다."
        : "이용할 계정 종류를 선택해주세요."}
      footer={applicationContext
        ? <span>처음 이용해도 소셜 로그인과 함께 배우 계정이 자동으로 만들어집니다.</span>
        : undefined}
    >
      {applicationContext ? <ApplicationAuthContextCard context={applicationContext} /> : null}
      {socialLoginError === "true" ? (
        <p role="alert" className="mb-5 rounded-control border border-fail/25 bg-fail-bg px-4 py-3 text-sm font-medium leading-6 text-foreground">
          소셜 로그인을 완료하지 못했습니다. 다시 시도해 주세요.
        </p>
      ) : null}
      <LoginForm returnTo={authSuccessReturnTo(safeReturnTo)} applicationFlow={Boolean(applicationContext)} />
    </AuthShell>
  );
}

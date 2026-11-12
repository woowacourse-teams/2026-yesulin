import { frontendEnvironment } from "@/config/environment";
import { headers } from "next/headers";
import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { ApplicationAuthContextCard } from "@/components/auth/application-auth-context";
import { applicationAuthContextForServer } from "@/features/auth/application-auth-context-server";
import { PRODUCER_LOGIN_PATH } from "@/features/auth/producer-navigation";
import { authSuccessReturnTo, safeAuthReturnTo } from "@/features/auth/return-to";

export const metadata: Metadata = { title: { absolute: "예술in" } };

async function localActorLoginEnabled() {
  if (process.env.NODE_ENV !== "development" || process.env.LOCAL_COMMUNITY_ACTOR_LOGIN !== "true") return false;
  if (frontendEnvironment.apiMockingEnabled || !process.env.API_ORIGIN) return false;
  const loopback = ["localhost", "127.0.0.1", "[::1]"];
  if (!loopback.includes(new URL(process.env.API_ORIGIN).hostname)) return false;
  const host = (await headers()).get("host") ?? "";
  return /^(?:localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/.test(host);
}

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
        : "소셜 계정으로 로그인해 주세요."}
      footer={applicationContext
        ? <span>처음 이용해도 소셜 로그인과 함께 회원 계정이 자동으로 만들어집니다.</span>
        : <><span>기획사/제작사이신가요?</span>{" "}<Link href={PRODUCER_LOGIN_PATH} className="font-semibold text-brand hover:text-brand-strong hover:underline">이메일로 로그인</Link></>}
    >
      {applicationContext ? <ApplicationAuthContextCard context={applicationContext} /> : null}
      {socialLoginError === "true" ? (
        <p role="alert" className="mb-5 rounded-control border border-fail/25 bg-fail-bg px-4 py-3 text-sm font-medium leading-6 text-foreground">
          소셜 로그인을 완료하지 못했습니다. 다시 시도해 주세요.
        </p>
      ) : null}
      <LoginForm localActorLogin={await localActorLoginEnabled()} returnTo={authSuccessReturnTo(safeReturnTo)} applicationFlow={Boolean(applicationContext)} />
    </AuthShell>
  );
}

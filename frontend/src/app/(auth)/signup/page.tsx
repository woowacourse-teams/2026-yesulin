import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { safeAuthReturnTo } from "@/features/auth/return-to";

export const metadata: Metadata = { title: "기획사/제작사 회원가입" };

export default async function SignupPage({ searchParams }: { readonly searchParams: Promise<{ returnTo?: string }> }) {
  const { returnTo } = await searchParams;
  const safeReturnTo = safeAuthReturnTo(returnTo);
  if (safeReturnTo) redirect(`/login?returnTo=${encodeURIComponent(safeReturnTo)}`);

  return (
    <AuthShell
      title="기획사/제작사 계정 만들기"
      description="가입 후 이메일 인증을 마치면 내 오디션 공고를 확인하고 관리할 수 있습니다."
      footer={<><span>이미 기획사/제작사 계정이 있나요?</span>{" "}<Link href="/login" className="font-semibold text-brand hover:text-brand-strong hover:underline">로그인</Link></>}
    >
      <SignupForm />
    </AuthShell>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";

export const metadata: Metadata = { title: "회원가입" };

export default async function SignupPage({ searchParams }: { readonly searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams;
  return (
    <AuthShell
      title={<Image src="/images/yesulin-logo-transparent.png" alt="예술in" width={132} height={66} priority className="h-auto w-[132px] object-contain" />}
      description="사용할 계정 유형과 기본 정보를 입력해 주세요."
      footer={<><span>이미 계정이 있나요?</span>{" "}<Link href="/login" className="font-semibold text-brand hover:text-brand-strong hover:underline">로그인</Link></>}
    >
      <SignupForm initialRole={role === "producer" ? "producer" : "applicant"} />
    </AuthShell>
  );
}

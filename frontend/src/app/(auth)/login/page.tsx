import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = { title: "로그인" };

export default async function LoginPage({ searchParams }: { readonly searchParams: Promise<{ role?: string }> }) {
  const { role } = await searchParams;
  return (
    <AuthShell
      title="다시 만나 반가워요"
      description="계정 유형을 선택하고 이메일로 로그인해 주세요."
      footer={<><span>아직 계정이 없나요?</span>{" "}<Link href="/signup" className="font-semibold text-brand hover:text-brand-strong hover:underline">회원가입</Link></>}
    >
      <LoginForm initialRole={role === "producer" ? "producer" : "applicant"} />
    </AuthShell>
  );
}

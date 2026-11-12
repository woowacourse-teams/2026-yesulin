import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { ProducerLoginForm } from "@/components/auth/producer-login-form";

export const metadata: Metadata = { title: "기획사/제작사 로그인" };

export default function ProducerLoginPage() {
  return (
    <AuthShell
      title="기획사/제작사 로그인"
      description="가입한 이메일과 비밀번호로 로그인해 주세요."
      fitViewport
      footer={<><span>배우·일반 회원이신가요?</span>{" "}<Link href="/login" className="font-semibold text-brand hover:text-brand-strong hover:underline">소셜 로그인</Link></>}
    >
      <ProducerLoginForm />
    </AuthShell>
  );
}

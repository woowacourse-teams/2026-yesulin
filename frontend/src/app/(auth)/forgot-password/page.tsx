import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { PasswordResetForm } from "@/components/auth/password-reset-form";

export const metadata: Metadata = { title: "비밀번호 재설정" };

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="비밀번호 재설정"
      description="가입한 이메일을 인증하고 새 비밀번호를 설정하세요."
      footer={<span>기획사/제작사 계정의 비밀번호만 재설정할 수 있어요.</span>}
    >
      <PasswordResetForm />
    </AuthShell>
  );
}

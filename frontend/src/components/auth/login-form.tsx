"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/ui/controls";
import { useToast } from "@/components/auditions/toast";
import { AuthInput, PasswordInput, RoleField, type AccountRole } from "./auth-fields";
import { SocialButtons } from "./social-buttons";
import {
  createFrontendCredential,
  type SocialProvider,
  useAuthSession,
} from "./auth-session";

type LoginErrors = Partial<Record<"identifier" | "password", string>>;

const PROVIDER_LABELS: Record<SocialProvider, string> = {
  kakao: "카카오",
  naver: "네이버",
  google: "Google",
};

export function LoginForm({ returnTo, applicationFlow = false }: { readonly returnTo?: string; readonly applicationFlow?: boolean }) {
  const toast = useToast();
  const router = useRouter();
  const { setSession } = useAuthSession();
  const [role, setRole] = useState<AccountRole>("applicant");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<LoginErrors>({});
  const [pendingProvider, setPendingProvider] = useState<SocialProvider>();

  function changeRole(nextRole: AccountRole) {
    setRole(nextRole);
    setIdentifier("");
    setPassword("");
    setErrors({});
  }

  function handleProducerLogin(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: LoginErrors = {};
    const trimmedIdentifier = identifier.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmedIdentifier)) nextErrors.identifier = "올바른 이메일 주소를 입력해 주세요.";
    if (!password) nextErrors.password = "비밀번호를 입력해 주세요.";
    setErrors(nextErrors);
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      requestAnimationFrame(() => document.getElementById(`login-${firstError}`)?.focus());
      return;
    }
    setSession({
      credential: createFrontendCredential(),
      role: "PRODUCER",
      displayName: trimmedIdentifier,
      producerStatus: "ACTIVE",
    });
    toast("기획사/제작사 계정으로 로그인했습니다.", { type: "success" });
    router.push("/producers/performances");
  }

  async function handleSocialLogin(provider: SocialProvider) {
    setPendingProvider(provider);
    await new Promise((resolve) => window.setTimeout(resolve, 240));
    setSession({
      credential: createFrontendCredential(),
      role: "APPLICANT",
      displayName: `${PROVIDER_LABELS[provider]} 배우`,
      socialProvider: provider,
    });
    toast(applicationFlow ? "로그인했습니다. 지원서 검토 화면으로 돌아갑니다." : "배우 계정으로 로그인했습니다.", { type: "success" });
    router.push(returnTo ?? "/applicants");
  }

  const applicantLogin = applicationFlow || role === "applicant";

  return (
    <div className="space-y-7">
      {!applicationFlow ? <RoleField value={role} onChange={changeRole} /> : null}

      {applicantLogin ? (
        <SocialButtons pendingProvider={pendingProvider} onSelect={(provider) => void handleSocialLogin(provider)} />
      ) : (
        <form onSubmit={handleProducerLogin} noValidate className="space-y-6">
          <div className="space-y-4">
            <AuthInput
              id="login-identifier"
              label="이메일"
              type="email"
              autoComplete="email"
              inputMode="email"
              placeholder="producer@example.com"
              value={identifier}
              error={errors.identifier}
              onChange={(event) => setIdentifier(event.target.value)}
            />
            <PasswordInput
              id="login-password"
              label="비밀번호"
              autoComplete="current-password"
              placeholder="비밀번호를 입력해 주세요"
              value={password}
              error={errors.password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <PrimaryButton type="submit" className="min-h-[52px] w-full text-base">기획사/제작사 로그인</PrimaryButton>
          <button
            type="button"
            onClick={() => toast("기획사/제작사 계정 찾기 화면은 준비 중입니다.", { type: "info" })}
            className="mx-auto block min-h-11 rounded-control px-3 text-sm font-semibold text-muted-strong transition-colors hover:bg-surface hover:text-brand"
          >
            비밀번호를 잊으셨나요?
          </button>
        </form>
      )}
    </div>
  );
}

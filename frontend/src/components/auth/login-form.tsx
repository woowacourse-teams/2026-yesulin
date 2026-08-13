"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/ui/controls";
import { useToast } from "@/components/auditions/toast";
import { AuthNoticeDialog, type AuthNotice } from "./auth-notice-dialog";
import { AuthInput, PasswordInput, RoleField, type AccountRole } from "./auth-fields";
import { SocialButtons } from "./social-buttons";
import { login } from "@/features/auth/api";

type LoginErrors = Partial<Record<"identifier" | "password", string>>;

export function LoginForm({ initialRole = "applicant" }: { readonly initialRole?: AccountRole }) {
  const toast = useToast();
  const router = useRouter();
  const [role, setRole] = useState<AccountRole>(initialRole);
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [notice, setNotice] = useState<AuthNotice | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function changeRole(nextRole: AccountRole) {
    setRole(nextRole);
    setIdentifier("");
    setPassword("");
    setErrors({});
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: LoginErrors = {};
    const trimmedIdentifier = identifier.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmedIdentifier)) {
      nextErrors.identifier = "올바른 이메일 주소를 입력해 주세요.";
    }
    if (!password) nextErrors.password = "비밀번호를 입력해 주세요.";
    setErrors(nextErrors);
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      requestAnimationFrame(() => document.getElementById(`login-${firstError}`)?.focus());
      return;
    }
    setSubmitting(true);
    try {
      const session = await login({ email: trimmedIdentifier, password });
      if (role === "producer" && session.activeCompanyId === null) {
        toast("소속된 공연사가 없습니다.", { type: "error" });
        setSubmitting(false);
        return;
      }
      toast("로그인했습니다.", { type: "success" });
      router.push(role === "producer" ? "/producers/performances" : "/applicants");
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "로그인하지 못했습니다.", { type: "error" });
      setSubmitting(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <RoleField value={role} onChange={changeRole} />

        <div className="space-y-4">
          <AuthInput
            id="login-identifier"
            label="이메일"
            type="email"
            autoComplete="email"
            inputMode="email"
            placeholder="name@example.com"
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

        <div className="flex min-h-11 items-center justify-between gap-3 text-sm">
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-muted-strong">
            <input
              type="checkbox"
              checked={remember}
              onChange={(event) => setRemember(event.target.checked)}
              className="h-5 w-5 rounded border-border accent-brand"
            />
            로그인 상태 유지
          </label>
          <button
            type="button"
            onClick={() => toast("계정 찾기 화면은 준비 중입니다.", { type: "info" })}
            className="min-h-11 rounded-control px-2 font-semibold text-muted-strong transition-colors hover:bg-surface hover:text-brand"
          >
            계정 찾기
          </button>
        </div>

        <PrimaryButton type="submit" disabled={submitting} className="min-h-[52px] w-full text-base">{submitting ? "로그인 중…" : "로그인"}</PrimaryButton>

        {role === "applicant" ? (
          <SocialButtons
            mode="로그인"
            onUnavailable={(provider) => setNotice({
              title: `${provider} 로그인 준비 중`,
              description: `${provider} OAuth 로그인 연동 로직이 필요합니다. 현재는 버튼 UI만 제공됩니다.`,
            })}
          />
        ) : null}
      </form>
      <AuthNoticeDialog notice={notice} onClose={() => setNotice(null)} />
    </>
  );
}

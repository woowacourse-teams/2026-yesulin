"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/auditions/ui-controls";
import { useToast } from "@/components/auditions/toast";
import { AuthNoticeDialog, type AuthNotice } from "./auth-notice-dialog";
import { AuthInput, PasswordInput, RoleField, type AccountRole } from "./auth-fields";
import { SocialButtons } from "./social-buttons";

type LoginErrors = Partial<Record<"identifier" | "password", string>>;
const MOCK_PRODUCER_IDS = new Set(["admin", "yesulin"]);

export function LoginForm() {
  const toast = useToast();
  const router = useRouter();
  const [role, setRole] = useState<AccountRole>("applicant");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [notice, setNotice] = useState<AuthNotice | null>(null);

  function changeRole(nextRole: AccountRole) {
    setRole(nextRole);
    setIdentifier("");
    setPassword("");
    setErrors({});
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: LoginErrors = {};
    const trimmedIdentifier = identifier.trim();
    if (role === "applicant" && !/^\S+@\S+\.\S+$/.test(trimmedIdentifier)) {
      nextErrors.identifier = "올바른 이메일 주소를 입력해 주세요.";
    }
    if (role === "producer" && !trimmedIdentifier) nextErrors.identifier = "아이디를 입력해 주세요.";
    if (!password) nextErrors.password = "비밀번호를 입력해 주세요.";
    setErrors(nextErrors);
    const firstError = Object.keys(nextErrors)[0];
    if (firstError) {
      requestAnimationFrame(() => document.getElementById(`login-${firstError}`)?.focus());
      return;
    }
    if (role === "producer") {
      if (MOCK_PRODUCER_IDS.has(trimmedIdentifier) && password === "1234") {
        router.push("/producers/performances");
        return;
      }
      setErrors({ password: "아이디 또는 비밀번호가 올바르지 않습니다." });
      requestAnimationFrame(() => document.getElementById("login-password")?.focus());
      return;
    }
    toast("지원자 데모 계정으로 로그인했어요.", { type: "success" });
    router.push("/applicants");
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="space-y-6">
        <RoleField value={role} onChange={changeRole} />

        <div className="space-y-4">
          <AuthInput
            id="login-identifier"
            label={role === "applicant" ? "이메일" : "아이디"}
            type={role === "applicant" ? "email" : "text"}
            autoComplete={role === "applicant" ? "email" : "username"}
            inputMode={role === "applicant" ? "email" : undefined}
            placeholder={role === "applicant" ? "name@example.com" : "아이디를 입력해 주세요"}
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

        <PrimaryButton type="submit" className="min-h-[52px] w-full text-base">로그인</PrimaryButton>

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

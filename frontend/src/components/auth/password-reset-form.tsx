"use client";

import { useState } from "react";
import { AuthInput, PasswordInput } from "./auth-fields";
import { PrimaryButton, PrimaryLink, TextButton, TextLink } from "@/components/ui/controls";

type Step = "EMAIL" | "VERIFY" | "PASSWORD" | "COMPLETE";
type Field = "email" | "code" | "password" | "passwordConfirm";
type Errors = Partial<Record<Field, string>>;

const STEPS = [
  { id: "EMAIL", label: "이메일" },
  { id: "VERIFY", label: "인증" },
  { id: "PASSWORD", label: "새 비밀번호" },
] as const;

const STEP_INDEX: Record<Step, number> = {
  EMAIL: 0,
  VERIFY: 1,
  PASSWORD: 2,
  COMPLETE: 3,
};

function focusField(field: Field) {
  requestAnimationFrame(() => document.getElementById(`reset-${field}`)?.focus());
}

export function PasswordResetForm() {
  const [step, setStep] = useState<Step>("EMAIL");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});

  function moveTo(nextStep: Step, field?: Field) {
    setErrors({});
    setStep(nextStep);
    if (field) focusField(field);
  }

  function submitEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setErrors({ email: "올바른 이메일 주소를 입력해 주세요." });
      focusField("email");
      return;
    }
    setEmail(trimmedEmail);
    moveTo("VERIFY", "code");
  }

  function submitCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setErrors({ code: "인증번호 숫자 6자리를 입력해 주세요." });
      focusField("code");
      return;
    }
    moveTo("PASSWORD", "password");
  }

  function submitPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: Errors = {};
    if (password.length < 8) nextErrors.password = "비밀번호는 8자 이상 입력해 주세요.";
    if (!passwordConfirm) nextErrors.passwordConfirm = "비밀번호를 한 번 더 입력해 주세요.";
    else if (passwordConfirm !== password) nextErrors.passwordConfirm = "비밀번호가 일치하지 않습니다.";
    setErrors(nextErrors);
    const firstError = Object.keys(nextErrors)[0] as Field | undefined;
    if (firstError) {
      focusField(firstError);
      return;
    }
    moveTo("COMPLETE");
  }

  if (step === "COMPLETE") {
    return (
      <section className="space-y-6 text-center" aria-labelledby="reset-complete-title">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-pass-bg text-2xl font-bold text-pass" aria-hidden="true">
          ✓
        </div>
        <div>
          <h2 id="reset-complete-title" className="text-xl font-bold text-foreground">비밀번호 재설정 흐름을 완료했어요</h2>
          <p className="mt-2 text-sm leading-6 text-muted-strong">새 비밀번호로 로그인하는 단계까지 이어집니다.</p>
        </div>
        <p className="rounded-control border border-warn-bg bg-warn-bg px-4 py-3 text-left text-sm leading-6 text-muted-strong">
          현재는 프론트 프로토타입으로, 실제 비밀번호는 변경되지 않습니다. 이메일 발송과 저장은 백엔드 인증 계약이 연결된 뒤 동작합니다.
        </p>
        <PrimaryLink href="/login" className="min-h-[52px] w-full text-base">로그인으로 돌아가기</PrimaryLink>
      </section>
    );
  }

  const currentIndex = STEP_INDEX[step];

  return (
    <div className="space-y-7">
      <ol className="grid grid-cols-3 gap-2" aria-label="비밀번호 재설정 단계">
        {STEPS.map((item, index) => {
          const current = index === currentIndex;
          const completed = index < currentIndex;
          return (
            <li
              key={item.id}
              aria-current={current ? "step" : undefined}
              className={`rounded-control border px-2 py-3 text-center text-xs font-semibold sm:text-sm ${
                current
                  ? "border-brand bg-brand-soft text-brand"
                  : completed
                    ? "border-brand-line bg-card text-brand"
                    : "border-border bg-surface text-muted"
              }`}
            >
              <span className="num mr-1">{completed ? "✓" : index + 1}</span>
              {item.label}
            </li>
          );
        })}
      </ol>

      {step === "EMAIL" ? (
        <form onSubmit={submitEmail} noValidate className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">가입한 이메일을 입력해 주세요</h2>
            <p className="mt-2 text-sm leading-6 text-muted">기획사/제작사 계정에 등록한 이메일로 본인 확인을 진행합니다.</p>
          </div>
          <AuthInput
            id="reset-email"
            label="이메일"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="producer@example.com"
            value={email}
            error={errors.email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <div className="space-y-2">
            <PrimaryButton type="submit" className="min-h-[52px] w-full text-base">인증번호 받기</PrimaryButton>
            <TextLink href="/login" className="mx-auto flex w-fit">로그인으로 돌아가기</TextLink>
          </div>
        </form>
      ) : null}

      {step === "VERIFY" ? (
        <form onSubmit={submitCode} noValidate className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">인증번호를 확인해 주세요</h2>
            <p className="mt-2 break-all text-sm leading-6 text-muted"><strong className="font-semibold text-foreground">{email}</strong>로 인증번호를 보냈습니다.</p>
          </div>
          <AuthInput
            id="reset-code"
            label="인증번호"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="숫자 6자리"
            value={code}
            error={errors.code}
            hint="현재 프로토타입에서는 임의의 숫자 6자리로 다음 단계를 확인할 수 있어요."
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
          />
          <div className="grid gap-2 sm:grid-cols-[auto_1fr]">
            <TextButton type="button" onClick={() => moveTo("EMAIL", "email")}>이메일 다시 입력</TextButton>
            <PrimaryButton type="submit" className="min-h-[52px] text-base">인증번호 확인</PrimaryButton>
          </div>
        </form>
      ) : null}

      {step === "PASSWORD" ? (
        <form onSubmit={submitPassword} noValidate className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">새 비밀번호를 설정해 주세요</h2>
            <p className="mt-2 text-sm leading-6 text-muted">확인을 위해 같은 비밀번호를 한 번 더 입력해 주세요.</p>
          </div>
          <div className="space-y-4">
            <PasswordInput
              id="reset-password"
              label="새 비밀번호"
              autoComplete="new-password"
              placeholder="8자 이상 입력해 주세요"
              value={password}
              error={errors.password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <PasswordInput
              id="reset-passwordConfirm"
              label="새 비밀번호 확인"
              autoComplete="new-password"
              placeholder="비밀번호를 한 번 더 입력해 주세요"
              value={passwordConfirm}
              error={errors.passwordConfirm}
              onChange={(event) => setPasswordConfirm(event.target.value)}
            />
          </div>
          <PrimaryButton type="submit" className="min-h-[52px] w-full text-base">비밀번호 변경</PrimaryButton>
        </form>
      ) : null}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { AuthInput, PasswordInput } from "./auth-fields";
import { PrimaryButton, PrimaryLink, TextButton, TextLink } from "@/components/ui/controls";
import {
  PasswordResetApiError,
  resetPassword,
  sendPasswordResetMail,
  validatePasswordResetToken,
} from "@/features/auth/password-reset-api";

type Step = "EMAIL" | "SENT" | "VERIFYING" | "PASSWORD" | "INVALID" | "COMPLETE";
type Field = "email" | "password" | "passwordConfirm";
type Errors = Partial<Record<Field, string>>;

const STEPS = [
  { id: "EMAIL", label: "이메일" },
  { id: "VERIFY", label: "메일 인증" },
  { id: "PASSWORD", label: "새 비밀번호" },
] as const;

const STEP_INDEX: Record<Step, number> = {
  EMAIL: 0,
  SENT: 1,
  VERIFYING: 1,
  INVALID: 1,
  PASSWORD: 2,
  COMPLETE: 3,
};

function focusField(field: Field) {
  requestAnimationFrame(() => document.getElementById(`reset-${field}`)?.focus());
}

function errorMessage(cause: unknown, fallback: string) {
  return cause instanceof Error && cause.message ? cause.message : fallback;
}

export function PasswordResetForm({ token }: { readonly token?: string }) {
  const [step, setStep] = useState<Step>(token ? "VERIFYING" : "EMAIL");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [requestError, setRequestError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) return;

    let active = true;
    void validatePasswordResetToken(token)
      .then(() => {
        if (active) {
          setStep("PASSWORD");
          focusField("password");
        }
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setRequestError(errorMessage(cause, "비밀번호 재설정 링크가 유효하지 않습니다."));
        setStep("INVALID");
      });
    return () => {
      active = false;
    };
  }, [token]);

  function moveTo(nextStep: Step, field?: Field) {
    setErrors({});
    setRequestError("");
    setStep(nextStep);
    if (field) focusField(field);
  }

  async function submitEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(trimmedEmail)) {
      setErrors({ email: "올바른 이메일 주소를 입력해 주세요." });
      focusField("email");
      return;
    }

    setSubmitting(true);
    setRequestError("");
    try {
      await sendPasswordResetMail(trimmedEmail);
      setEmail(trimmedEmail);
      setStep("SENT");
    } catch (cause) {
      setRequestError(errorMessage(cause, "비밀번호 재설정 메일을 보내지 못했습니다."));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token) return;

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

    setSubmitting(true);
    setRequestError("");
    try {
      await resetPassword(token, password, passwordConfirm);
      setStep("COMPLETE");
    } catch (cause) {
      if (
        cause instanceof PasswordResetApiError
        && ["AUTH_INVALID_PASSWORD_RESET", "AUTH_EXPIRED_PASSWORD_RESET"].includes(cause.code ?? "")
      ) {
        setRequestError(cause.message);
        setStep("INVALID");
      } else {
        setRequestError(errorMessage(cause, "비밀번호를 변경하지 못했습니다."));
      }
    } finally {
      setSubmitting(false);
    }
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
        <form onSubmit={(event) => void submitEmail(event)} noValidate className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">가입한 이메일을 입력해 주세요</h2>
            <p className="mt-2 text-sm leading-6 text-muted">기획사/제작사 계정에 등록한 이메일로 재설정 링크를 보내드립니다.</p>
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
            onChange={(event) => {
              setEmail(event.target.value);
              setErrors({});
              setRequestError("");
            }}
          />
          <RequestError message={requestError} />
          <div className="space-y-2">
            <PrimaryButton type="submit" disabled={submitting} className="min-h-[52px] w-full text-base">
              {submitting ? "메일 전송 중…" : "재설정 메일 받기"}
            </PrimaryButton>
            <TextLink href="/login" className="mx-auto flex w-fit">로그인으로 돌아가기</TextLink>
          </div>
        </form>
      ) : null}

      {step === "SENT" ? (
        <StatusPanel
          icon="✉"
          title="재설정 메일을 확인해 주세요"
          description={<>입력한 이메일로 등록된 계정이 있다면 <strong className="font-semibold text-foreground">{email}</strong>로 링크를 보냈습니다. 5분 안에 링크를 눌러 주세요.</>}
        >
          <TextButton type="button" onClick={() => moveTo("EMAIL", "email")} className="w-full">
            이메일 다시 입력
          </TextButton>
        </StatusPanel>
      ) : null}

      {step === "VERIFYING" ? (
        <StatusPanel
          icon="…"
          title="재설정 링크를 확인하고 있어요"
          description="잠시만 기다려 주세요. 확인이 끝나면 새 비밀번호를 설정할 수 있습니다."
        />
      ) : null}

      {step === "INVALID" ? (
        <StatusPanel
          icon="!"
          title="재설정 링크를 사용할 수 없어요"
          description={requestError || "링크가 만료됐거나 이미 사용되었습니다. 재설정 메일을 다시 요청해 주세요."}
        >
          <PrimaryLink href="/forgot-password" className="min-h-[52px] w-full text-base">
            재설정 메일 다시 받기
          </PrimaryLink>
        </StatusPanel>
      ) : null}

      {step === "PASSWORD" ? (
        <form onSubmit={(event) => void submitPassword(event)} noValidate className="space-y-6">
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
              maxLength={64}
              onChange={(event) => {
                setPassword(event.target.value);
                setErrors((current) => ({ ...current, password: undefined }));
                setRequestError("");
              }}
            />
            <PasswordInput
              id="reset-passwordConfirm"
              label="새 비밀번호 확인"
              autoComplete="new-password"
              placeholder="비밀번호를 한 번 더 입력해 주세요"
              value={passwordConfirm}
              error={errors.passwordConfirm}
              maxLength={64}
              onChange={(event) => {
                setPasswordConfirm(event.target.value);
                setErrors((current) => ({ ...current, passwordConfirm: undefined }));
                setRequestError("");
              }}
            />
          </div>
          <RequestError message={requestError} />
          <PrimaryButton type="submit" disabled={submitting} className="min-h-[52px] w-full text-base">
            {submitting ? "변경 중…" : "비밀번호 변경"}
          </PrimaryButton>
        </form>
      ) : null}

      {step === "COMPLETE" ? (
        <StatusPanel
          icon="✓"
          title="비밀번호가 변경되었습니다"
          description="새 비밀번호로 기획사/제작사 계정에 로그인해 주세요."
        >
          <PrimaryLink href="/login" className="min-h-[52px] w-full text-base">로그인하기</PrimaryLink>
        </StatusPanel>
      ) : null}
    </div>
  );
}

function RequestError({ message }: { readonly message: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-control border border-fail/25 bg-fail-bg px-4 py-3 text-sm font-medium text-fail">
      {message}
    </p>
  );
}

function StatusPanel({ icon, title, description, children }: {
  readonly icon: string;
  readonly title: string;
  readonly description: React.ReactNode;
  readonly children?: React.ReactNode;
}) {
  return (
    <section
      className="space-y-6 text-center"
      aria-labelledby="password-reset-status-title"
      aria-live="polite"
    >
      <div
        className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-2xl font-bold text-brand"
        aria-hidden="true"
      >
        {icon}
      </div>
      <div>
        <h2 id="password-reset-status-title" className="text-xl font-bold text-foreground">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-muted-strong">{description}</p>
      </div>
      {children}
    </section>
  );
}

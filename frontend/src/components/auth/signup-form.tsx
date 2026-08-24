"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/ui/controls";
import { useToast } from "@/components/auditions/toast";
import { signupProducer } from "@/features/auth/api";
import { login as requestLogin } from "@/features/auth/session-api";
import { AuthInput, PasswordInput } from "./auth-fields";
import { ProducerSignupFields } from "./producer-signup-fields";
import { useAuthSession } from "./auth-session";

type SignupField = "company" | "phone" | "email" | "password" | "passwordConfirm" | "terms";
type SignupErrors = Partial<Record<SignupField, string>>;

const INITIAL_VALUES = {
  company: "",
  phone: "",
  email: "",
  password: "",
  passwordConfirm: "",
};

function formatPhoneNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, digits.length - 4)}-${digits.slice(-4)}`;
}

export function SignupForm() {
  const toast = useToast();
  const router = useRouter();
  const { setSession } = useAuthSession();
  const [values, setValues] = useState(INITIAL_VALUES);
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof typeof values, value: string) {
    setValues((current) => ({ ...current, [field]: field === "phone" ? formatPhoneNumber(value) : value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function focusField(field: SignupField) {
    requestAnimationFrame(() => document.getElementById(`signup-${field}`)?.focus());
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: SignupErrors = {};
    if (!values.company.trim()) nextErrors.company = "기획사/제작사명을 입력해 주세요.";
    if (!/^01\d{8,9}$/.test(values.phone.replace(/\D/g, ""))) nextErrors.phone = "올바른 휴대폰 번호를 입력해 주세요.";
    if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) nextErrors.email = "올바른 이메일 주소를 입력해 주세요.";
    if (values.password.length < 8) nextErrors.password = "비밀번호는 8자 이상 입력해 주세요.";
    if (!values.passwordConfirm) nextErrors.passwordConfirm = "비밀번호를 한 번 더 입력해 주세요.";
    else if (values.passwordConfirm !== values.password) nextErrors.passwordConfirm = "비밀번호가 일치하지 않습니다.";
    if (!terms) nextErrors.terms = "필수 약관에 동의해 주세요.";
    setErrors(nextErrors);
    const firstError = Object.keys(nextErrors)[0] as SignupField | undefined;
    if (firstError) {
      focusField(firstError);
      return;
    }

    setSubmitting(true);
    try {
      const response = await signupProducer({
        companyName: values.company.trim(),
        phone: values.phone.replace(/\D/g, ""),
        email: values.email.trim(),
        password: values.password,
        passwordConfirm: values.passwordConfirm,
        termsAgreed: terms,
      });
      const serverSession = await requestLogin(response.email, values.password);
      setSession({
        credential: `member-${serverSession.memberId}`,
        role: serverSession.role,
        displayName: response.companyName,
        producerStatus: serverSession.status,
      });
      toast("기획사/제작사 가입과 로그인이 완료되었습니다.", { type: "success" });
      router.replace("/producers/performances");
    } catch (cause) {
      toast(cause instanceof Error ? cause.message : "기획사/제작사 계정을 만들지 못했습니다.", { type: "error" });
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      <ProducerSignupFields values={values} errors={errors} onUpdate={update} />

      <section aria-labelledby="signup-account-heading" className="space-y-4 border-t border-border-soft pt-8">
        <div>
          <h2 id="signup-account-heading" className="text-base font-bold text-foreground">계정 정보</h2>
          <p className="mt-1 text-sm text-muted">기획사/제작사 로그인에 사용할 이메일과 비밀번호를 입력해 주세요.</p>
        </div>
        <AuthInput id="signup-email" label="이메일" type="email" autoComplete="email" inputMode="email" placeholder="producer@example.com" value={values.email} error={errors.email} onChange={(event) => update("email", event.target.value)} />
        <PasswordInput id="signup-password" label="비밀번호" autoComplete="new-password" placeholder="8자 이상 입력해 주세요" value={values.password} error={errors.password} onChange={(event) => update("password", event.target.value)} />
        <PasswordInput id="signup-passwordConfirm" label="비밀번호 확인" autoComplete="new-password" placeholder="비밀번호를 한 번 더 입력해 주세요" value={values.passwordConfirm} error={errors.passwordConfirm} onChange={(event) => update("passwordConfirm", event.target.value)} />
      </section>

      <div>
        <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-control border border-border bg-surface px-3 py-3 text-sm text-muted-strong">
          <input id="signup-terms" type="checkbox" checked={terms} aria-invalid={errors.terms ? true : undefined} aria-describedby={errors.terms ? "signup-terms-error" : undefined} onChange={(event) => setTerms(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 rounded border-border accent-brand" />
          <span><strong className="text-foreground">[필수]</strong> 서비스 이용약관과 개인정보 처리방침에 동의합니다.</span>
        </label>
        {errors.terms ? <p id="signup-terms-error" className="mt-1.5 text-sm font-medium text-fail">{errors.terms}</p> : null}
      </div>

      <PrimaryButton type="submit" disabled={submitting} className="min-h-[52px] w-full text-base">
        {submitting ? "가입 중…" : "기획사/제작사 회원가입"}
      </PrimaryButton>
    </form>
  );
}

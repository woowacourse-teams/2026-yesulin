"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PrimaryButton } from "@/components/ui/controls";
import { useToast } from "@/components/auditions/toast";
import { AuthInput, PasswordInput, RoleField, type AccountRole } from "./auth-fields";
import { AuthNoticeDialog, type AuthNotice } from "./auth-notice-dialog";
import { ProducerSignupFields } from "./producer-signup-fields";
import { SocialButtons } from "./social-buttons";
import { signupApplicant } from "@/features/auth/api";

type SignupField = "name" | "phone" | "company" | "businessNumber" | "email" | "password" | "passwordConfirm" | "terms";
type SignupErrors = Partial<Record<SignupField, string>>;

const INITIAL_VALUES = {
  name: "",
  phone: "",
  company: "",
  businessNumber: "",
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

function formatBusinessNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);
  return [digits.slice(0, 3), digits.slice(3, 5), digits.slice(5)].filter(Boolean).join("-");
}

export function SignupForm({ initialRole = "applicant", profileClaimToken }: { readonly initialRole?: AccountRole; readonly profileClaimToken?: string }) {
  const toast = useToast();
  const router = useRouter();
  const [role, setRole] = useState<AccountRole>(initialRole);
  const [values, setValues] = useState(INITIAL_VALUES);
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<SignupErrors>({});
  const [notice, setNotice] = useState<AuthNotice | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field: keyof typeof values, value: string) {
    const formatted = field === "phone" ? formatPhoneNumber(value) : field === "businessNumber" ? formatBusinessNumber(value) : value;
    setValues((current) => ({ ...current, [field]: formatted }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function focusField(field: SignupField) {
    requestAnimationFrame(() => document.getElementById(`signup-${field}`)?.focus());
  }

  function requestPhoneVerification() {
    if (!values.name.trim()) {
      setErrors((current) => ({ ...current, name: "대표자명을 먼저 입력해 주세요." }));
      focusField("name");
      return;
    }
    if (!/^01\d{8,9}$/.test(values.phone.replace(/\D/g, ""))) {
      setErrors((current) => ({ ...current, phone: "올바른 휴대폰 번호를 입력해 주세요." }));
      focusField("phone");
      return;
    }
    setNotice({
      title: "휴대폰 본인 인증 연동 필요",
      description: "대표자명과 휴대폰 번호로 본인 인증을 진행하는 API 연결이 필요합니다. 현재는 인증 요청 화면만 제공합니다.",
    });
  }

  function checkKopis() {
    if (!values.company.trim()) {
      setErrors((current) => ({ ...current, company: "KOPIS에서 확인할 공연사명을 입력해 주세요." }));
      focusField("company");
      return;
    }
    setNotice({
      title: "KOPIS 공연사 확인 연동 필요",
      description: `KOPIS에서 ‘${values.company.trim()}’의 공연사 등록 여부를 확인하는 API 연결이 필요합니다.`,
    });
  }

  function checkBusiness() {
    const nextErrors: SignupErrors = {};
    if (!values.name.trim()) nextErrors.name = "대표자명을 먼저 입력해 주세요.";
    if (!values.company.trim()) nextErrors.company = "공연사명을 먼저 입력해 주세요.";
    if (values.businessNumber.replace(/\D/g, "").length !== 10) nextErrors.businessNumber = "사업자등록번호 숫자 10자리를 입력해 주세요.";
    if (Object.keys(nextErrors).length) {
      setErrors((current) => ({ ...current, ...nextErrors }));
      focusField(Object.keys(nextErrors)[0] as SignupField);
      return;
    }
    setNotice({
      title: "사업자 정보 확인 연동 필요",
      description: "국세청 API에서 유효 사업자 여부를 확인하고, 사업자등록번호에 등록된 대표자명과 공연사명이 입력 정보와 일치하는지 검증해야 합니다.",
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: SignupErrors = {};
    if (!values.name.trim()) nextErrors.name = role === "applicant" ? "이름을 입력해 주세요." : "대표자명을 입력해 주세요.";
    if (role === "producer" && !/^01\d{8,9}$/.test(values.phone.replace(/\D/g, ""))) nextErrors.phone = "올바른 휴대폰 번호를 입력해 주세요.";
    if (role === "producer" && !values.company.trim()) nextErrors.company = "공연사명을 입력해 주세요.";
    if (role === "producer" && values.businessNumber.replace(/\D/g, "").length !== 10) nextErrors.businessNumber = "사업자등록번호 숫자 10자리를 입력해 주세요.";
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
    if (role === "applicant") {
      setSubmitting(true);
      try {
        const response = await signupApplicant({
          name: values.name.trim(),
          email: values.email.trim(),
          password: values.password,
          passwordConfirm: values.passwordConfirm,
          termsAgreed: terms,
          ...(profileClaimToken ? { profileClaimToken } : {}),
        });
        if (response.profileClaimed) toast("지원서 정보와 지원 내역을 새 계정에 연결했어요.", { type: "success" });
        else if (profileClaimToken) toast("계정은 만들었지만 지원서 연결 토큰이 만료됐거나 이미 사용됐어요.", { type: "info" });
        else toast("지원자 계정을 만들었어요.", { type: "success" });
        router.push(response.redirectTo);
      } catch (cause) {
        toast(cause instanceof Error ? cause.message : "계정을 만들지 못했습니다.", { type: "error" });
        setSubmitting(false);
      }
      return;
    }
    toast("공연사 회원가입 API 연결 전입니다.", { type: "info" });
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="space-y-8">
        <RoleField value={role} onChange={(nextRole) => { setRole(nextRole); setErrors({}); }} />

        {role === "applicant" && profileClaimToken ? <div className="rounded-card border border-brand-line bg-brand-soft p-4 text-sm leading-6 text-muted-strong"><strong className="block text-brand">방금 제출한 지원서를 연결할게요.</strong>가입이 완료되면 표준 프로필 정보와 지원 내역을 새 계정에서 이어서 관리할 수 있어요.</div> : null}

        {role === "producer" ? (
          <ProducerSignupFields
            values={values}
            errors={errors}
            onUpdate={update}
            onRequestPhoneVerification={requestPhoneVerification}
            onCheckBusiness={checkBusiness}
            onCheckKopis={checkKopis}
          />
        ) : (
          <AuthInput id="signup-name" label="이름" autoComplete="name" placeholder="이름을 입력해 주세요" value={values.name} error={errors.name} onChange={(event) => update("name", event.target.value)} />
        )}

        <section aria-labelledby="signup-account-heading" className={`space-y-4 ${role === "producer" ? "border-t border-border-soft pt-8" : ""}`}>
          {role === "producer" ? (
            <div id="signup-account-heading" className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-white">3</span>
              <div><h2 className="text-base font-bold text-foreground">계정 정보</h2><p className="mt-1 text-sm text-muted">로그인에 사용할 이메일과 비밀번호를 입력해 주세요.</p></div>
            </div>
          ) : null}
          <AuthInput id="signup-email" label="이메일" type="email" autoComplete="email" inputMode="email" placeholder="name@example.com" value={values.email} error={errors.email} onChange={(event) => update("email", event.target.value)} />
          <PasswordInput id="signup-password" label="비밀번호" autoComplete="new-password" placeholder="8자 이상 입력해 주세요" hint="영문, 숫자, 특수문자를 조합하면 더 안전해요." value={values.password} error={errors.password} onChange={(event) => update("password", event.target.value)} />
          <PasswordInput id="signup-passwordConfirm" label="비밀번호 확인" autoComplete="new-password" placeholder="비밀번호를 한 번 더 입력해 주세요" value={values.passwordConfirm} error={errors.passwordConfirm} onChange={(event) => update("passwordConfirm", event.target.value)} />
        </section>

        <div>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-control border border-border bg-surface px-3 py-3 text-sm text-muted-strong">
            <input id="signup-terms" type="checkbox" checked={terms} aria-invalid={errors.terms ? true : undefined} aria-describedby={errors.terms ? "signup-terms-error" : undefined} onChange={(event) => setTerms(event.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 rounded border-border accent-brand" />
            <span><strong className="text-foreground">[필수]</strong> 서비스 이용약관과 개인정보 처리방침에 동의합니다.</span>
          </label>
          {errors.terms ? <p id="signup-terms-error" className="mt-1.5 text-sm font-medium text-fail">{errors.terms}</p> : null}
        </div>

        <PrimaryButton type="submit" disabled={submitting} className="min-h-[52px] w-full text-base">{submitting ? "계정 만드는 중…" : role === "producer" ? "공연사 계정 만들기" : "지원자 계정 만들기"}</PrimaryButton>
        {role === "applicant" ? <SocialButtons mode="회원가입" onUnavailable={(provider) => setNotice({ title: `${provider} 회원가입 준비 중`, description: `${provider} OAuth 회원가입 연동 로직이 필요합니다. 현재는 버튼 UI만 제공됩니다.` })} /> : null}
      </form>
      <AuthNoticeDialog notice={notice} onClose={() => setNotice(null)} />
    </>
  );
}

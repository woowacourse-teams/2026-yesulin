import { AuthInput } from "./auth-fields";

export type ProducerSignupValues = {
  readonly company: string;
  readonly phone: string;
};

export type ProducerSignupErrors = Partial<Record<keyof ProducerSignupValues, string>>;

export function ProducerSignupFields({ values, errors, onUpdate }: {
  readonly values: ProducerSignupValues;
  readonly errors: ProducerSignupErrors;
  readonly onUpdate: (field: keyof ProducerSignupValues, value: string) => void;
}) {
  return (
    <section aria-labelledby="producer-company-heading" className="space-y-4">
      <div className="rounded-control border border-brand-line bg-brand-soft px-4 py-3">
        <h2 id="producer-company-heading" className="text-sm font-semibold text-brand-strong">가입 즉시 공연 관리를 시작할 수 있습니다</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-strong">
          기본 계정 정보를 등록하면 바로 로그인되어 공연 관리 화면으로 이동합니다.
        </p>
      </div>
      <AuthInput
        id="signup-company"
        label="기획사/제작사명"
        autoComplete="organization"
        placeholder="기획사/제작사 또는 단체명을 입력해 주세요"
        value={values.company}
        error={errors.company}
        onChange={(event) => onUpdate("company", event.target.value)}
      />
      <AuthInput
        id="signup-phone"
        label="휴대폰 번호"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="010-0000-0000"
        hint="계정과 서비스 관련 안내를 받을 번호를 입력해 주세요."
        value={values.phone}
        error={errors.phone}
        onChange={(event) => onUpdate("phone", event.target.value)}
      />
    </section>
  );
}

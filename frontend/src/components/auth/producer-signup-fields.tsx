import { ActionInput, AuthInput } from "./auth-fields";

export type ProducerSignupValues = {
  readonly name: string;
  readonly phone: string;
  readonly company: string;
  readonly businessNumber: string;
};

export type ProducerSignupErrors = Partial<Record<keyof ProducerSignupValues, string>>;

type ProducerSignupFieldsProps = {
  readonly values: ProducerSignupValues;
  readonly errors: ProducerSignupErrors;
  readonly onUpdate: (field: keyof ProducerSignupValues, value: string) => void;
  readonly onRequestPhoneVerification: () => void;
  readonly onCheckBusiness: () => void;
  readonly onCheckKopis: () => void;
};

function SectionHeading({ number, title, description }: {
  readonly number: string;
  readonly title: string;
  readonly description: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-sm font-bold text-white">
        {number}
      </span>
      <div>
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">{description}</p>
      </div>
    </div>
  );
}

export function ProducerSignupFields({
  values,
  errors,
  onUpdate,
  onRequestPhoneVerification,
  onCheckBusiness,
  onCheckKopis,
}: ProducerSignupFieldsProps) {
  return (
    <div className="space-y-8">
      <div className="rounded-control border border-brand-line bg-brand-soft px-4 py-3">
        <p className="text-sm font-semibold text-brand-strong">공연사 가입 확인 절차</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-strong">
          대표자 본인 확인 후 사업자 정보와 KOPIS 등록 정보를 순서대로 확인합니다.
        </p>
      </div>

      <section aria-labelledby="producer-owner-heading" className="space-y-4">
        <div id="producer-owner-heading">
          <SectionHeading
            number="1"
            title="대표자 본인 확인"
            description="대표자명과 대표자 명의의 휴대폰 번호를 확인합니다."
          />
        </div>
        <AuthInput
          id="signup-name"
          label="대표자명"
          autoComplete="name"
          placeholder="사업자등록증의 대표자명을 입력해 주세요"
          value={values.name}
          error={errors.name}
          onChange={(event) => onUpdate("name", event.target.value)}
        />
        <ActionInput
          id="signup-phone"
          label="대표자 휴대폰 번호"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="010-0000-0000"
          hint="대표자 본인 명의의 휴대폰으로 인증해 주세요."
          value={values.phone}
          error={errors.phone}
          actionLabel="인증 요청"
          onAction={onRequestPhoneVerification}
          onChange={(event) => onUpdate("phone", event.target.value)}
        />
      </section>

      <section aria-labelledby="producer-company-heading" className="space-y-4 border-t border-border-soft pt-8">
        <div id="producer-company-heading">
          <SectionHeading
            number="2"
            title="공연사 확인"
            description="공연사 등록 정보와 유효한 사업자인지 확인합니다."
          />
        </div>
        <ActionInput
          id="signup-company"
          label="공연사명"
          autoComplete="organization"
          placeholder="등록된 공연사 또는 단체명을 입력해 주세요"
          hint="입력한 명칭으로 KOPIS 등록 여부를 확인합니다."
          value={values.company}
          error={errors.company}
          actionLabel="KOPIS 확인"
          onAction={onCheckKopis}
          onChange={(event) => onUpdate("company", event.target.value)}
        />
        <ActionInput
          id="signup-businessNumber"
          label="사업자등록번호"
          inputMode="numeric"
          autoComplete="off"
          placeholder="000-00-00000"
          hint="유효한 사업자인지 확인하고 대표자명·공연사명 일치 여부를 검증합니다."
          value={values.businessNumber}
          error={errors.businessNumber}
          actionLabel="사업자 확인"
          onAction={onCheckBusiness}
          onChange={(event) => onUpdate("businessNumber", event.target.value)}
        />
      </section>
    </div>
  );
}

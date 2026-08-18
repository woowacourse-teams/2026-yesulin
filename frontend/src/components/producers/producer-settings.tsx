"use client";

import { useState } from "react";
import { Breadcrumb } from "@/components/auditions/breadcrumb";
import { ScreenError } from "@/components/auditions/screen-status";
import { useToast } from "@/components/auditions/toast";
import { FieldInput, FieldTextarea, PrimaryButton } from "@/components/ui/controls";
import { getProducerProfile, updateProducerProfile } from "@/features/auditions/api";
import { notifyProducerProfileChanged } from "@/features/auditions/events";
import type { ProducerProfile } from "@/features/auditions/management-types";
import { errorMessage, useAuditionQuery } from "@/features/auditions/use-audition-query";

export function ProducerSettings() {
  const query = useAuditionQuery(
    "producer-profile",
    getProducerProfile,
    "기획사/제작사 정보를 불러오지 못했습니다.",
  );

  return (
    <>
      <Breadcrumb items={[{ label: "기획사/제작사 설정" }]} />
      {query.loading ? <SettingsSkeleton /> : null}
      {query.error || !query.data ? (
        <div className="p-5 md:p-8"><ScreenError message={query.error} onRetry={query.reload} /></div>
      ) : (
        <ProducerSettingsForm key={JSON.stringify(query.data)} profile={query.data} />
      )}
    </>
  );
}

function ProducerSettingsForm({ profile }: { readonly profile: ProducerProfile }) {
  const initialValues = {
    companyName: profile.companyName,
    contactName: profile.contactName,
    contactRole: profile.contactRole,
    description: profile.description,
  };
  const [companyName, setCompanyName] = useState(initialValues.companyName);
  const [contactName, setContactName] = useState(initialValues.contactName);
  const [contactRole, setContactRole] = useState(initialValues.contactRole);
  const [description, setDescription] = useState(initialValues.description);
  const [savedValues, setSavedValues] = useState(initialValues);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const toast = useToast();
  const values = { companyName, contactName, contactRole, description };
  const changed = Object.keys(values).some(
    (key) => values[key as keyof typeof values] !== savedValues[key as keyof typeof savedValues],
  );

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const next = await updateProducerProfile(values);
      setSavedValues({
        companyName: next.companyName,
        contactName: next.contactName,
        contactRole: next.contactRole,
        description: next.description,
      });
      notifyProducerProfileChanged();
      toast("기획사/제작사 정보를 저장했습니다.");
    } catch (cause) {
      setFormError(errorMessage(cause, "기획사/제작사 정보를 저장하지 못했습니다."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-[960px] px-5 py-9 md:px-8 md:py-12">
      <header>
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold text-brand">기획사/제작사 설정</p>
          <VerificationBadge status={profile.verificationStatus} />
        </div>
        <h1 className="mt-2 text-[clamp(28px,4vw,38px)] font-bold tracking-[-0.035em]">
          공개 정보와 내부 담당자를 관리하세요.
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-muted-strong">
          배우에게 보이는 정보와 기획사/제작사 내부 운영 정보를 구분해 관리합니다.
        </p>
      </header>

      <form onSubmit={submit} className="mt-8 space-y-5">
        <SettingsSection title="배우에게 공개되는 정보" tone="public" description="공개 공고와 배우의 지원 내역에 표시됩니다.">
          <div className="grid gap-5">
            <SettingsField label="기획사/제작사명" hint="공개 공고와 지원 내역에 표시">
              <FieldInput required value={companyName} onChange={(event) => setCompanyName(event.target.value)} />
            </SettingsField>
            <SettingsField label="기획사/제작사 소개" hint={`${description.length} / 200자`}>
              <FieldTextarea value={description} maxLength={200} onChange={(event) => setDescription(event.target.value)} className="min-h-28 resize-y" />
            </SettingsField>
          </div>
        </SettingsSection>

        <SettingsSection title="내부 담당자 정보" tone="private" description="운영진 확인과 기획사/제작사 내부 관리에만 사용하며 배우에게 공개하지 않습니다.">
          <div className="grid gap-4 md:grid-cols-2">
            <SettingsField label="담당자명" hint="지원자에게 비공개">
              <FieldInput required value={contactName} onChange={(event) => setContactName(event.target.value)} />
            </SettingsField>
            <SettingsField label="담당 업무" hint="지원자에게 비공개">
              <FieldInput value={contactRole} onChange={(event) => setContactRole(event.target.value)} placeholder="예: 캐스팅 담당" />
            </SettingsField>
          </div>
        </SettingsSection>

        <section className="rounded-card border border-border bg-surface p-5 md:p-6">
          <h2 className="text-lg font-bold">인증 및 계정 정보</h2>
          <p className="mt-2 text-sm leading-6 text-muted">가입 정보와 운영진 확인 상태입니다. 배우에게 공개되지 않습니다.</p>
          <dl className="mt-5 grid gap-4 text-sm md:grid-cols-2">
            <ReadOnly label="로그인 이메일" value={profile.email} />
            <ReadOnly label="연락처" value={profile.phone} />
            <ReadOnly label="계정 상태" value={profile.verificationStatus === "ACTIVE" ? "활성화 완료" : "활성화 대기"} />
            <ReadOnly label="활성화 완료일" value={profile.verifiedAt ? new Intl.DateTimeFormat("ko-KR", { dateStyle: "long" }).format(new Date(profile.verifiedAt)) : "운영진 확인 중"} />
          </dl>
        </section>

        {formError ? <p role="alert" className="rounded-control border border-fail/20 bg-fail-bg px-4 py-3 text-sm font-medium text-fail">{formError}</p> : null}
        <div className="flex justify-end"><PrimaryButton type="submit" disabled={!changed || saving}>{saving ? "저장 중…" : "변경 사항 저장"}</PrimaryButton></div>
      </form>
    </div>
  );
}

function SettingsSection({ title, description, tone, children }: { readonly title: string; readonly description: string; readonly tone: "public" | "private"; readonly children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-card p-5 md:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-lg font-bold">{title}</h2>
        <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${tone === "public" ? "border-brand-line bg-brand-soft text-brand" : "border-pending/30 bg-pending-bg text-muted-strong"}`}>
          {tone === "public" ? "배우에게 공개" : "내부 운영용"}
        </span>
      </div>
      <p className="mt-2 text-sm leading-6 text-muted">{description}</p>
      <div className="mt-5">{children}</div>
    </section>
  );
}

function SettingsField({ label, hint, children }: { readonly label: string; readonly hint?: string; readonly children: React.ReactNode }) {
  return <label className="block"><span className="mb-1.5 flex flex-wrap items-center gap-2 text-sm font-semibold text-muted-strong">{label}{hint ? <small className="ml-auto font-normal text-muted">{hint}</small> : null}</span>{children}</label>;
}

function ReadOnly({ label, value }: { readonly label: string; readonly value: string }) {
  return <div><dt className="text-muted">{label}</dt><dd className="num mt-1 font-semibold text-foreground">{value || "등록되지 않음"}</dd></div>;
}

function VerificationBadge({ status }: { readonly status: ProducerProfile["verificationStatus"] }) {
  const active = status === "ACTIVE";
  return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${active ? "border-pass/30 bg-pass-bg text-pass" : "border-warn/30 bg-warn-bg text-warn"}`}>{active ? "활성화 완료" : "활성화 대기"}</span>;
}

function SettingsSkeleton() {
  return <div className="mx-auto max-w-[960px] animate-pulse px-5 py-9 md:px-8"><div className="h-10 w-72 rounded bg-border" /><div className="mt-10 h-80 rounded-card bg-border-soft" /></div>;
}

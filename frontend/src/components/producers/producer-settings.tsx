"use client";

import { useState } from "react";
import { getProducerProfile, updateProducerProfile } from "@/features/auditions/api";
import { notifyProducerProfileChanged } from "@/features/auditions/events";
import type { ProducerProfile } from "@/features/auditions/management-types";
import { useAuditionQuery, errorMessage } from "@/features/auditions/use-audition-query";
import { Breadcrumb } from "@/components/auditions/breadcrumb";
import { ScreenError } from "@/components/auditions/screen-status";
import { useToast } from "@/components/auditions/toast";
import { FieldInput, FieldTextarea, PrimaryButton } from "@/components/ui/controls";

export function ProducerSettings() {
  const query = useAuditionQuery("producer-profile", getProducerProfile, "공연사 정보를 불러오지 못했습니다.");
  return <><Breadcrumb items={[{ label: "공연사 설정" }]} />{query.loading ? <SettingsSkeleton /> : null}{query.error || !query.data ? <div className="p-5 md:p-8"><ScreenError message={query.error} onRetry={query.reload} /></div> : <ProducerSettingsForm key={JSON.stringify(query.data)} profile={query.data} />}</>;
}

function ProducerSettingsForm({ profile }: { readonly profile: ProducerProfile }) {
  const [companyName, setCompanyName] = useState(profile.companyName);
  const [contactName, setContactName] = useState(profile.contactName);
  const [contactRole, setContactRole] = useState(profile.contactRole);
  const [description, setDescription] = useState(profile.description);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [savedValues, setSavedValues] = useState({ companyName: profile.companyName, contactName: profile.contactName, contactRole: profile.contactRole, description: profile.description });
  const toast = useToast();
  const changed = companyName !== savedValues.companyName || contactName !== savedValues.contactName || contactRole !== savedValues.contactRole || description !== savedValues.description;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFormError("");
    try {
      const next = await updateProducerProfile({ companyName, contactName, contactRole, description });
      setSavedValues({ companyName: next.companyName, contactName: next.contactName, contactRole: next.contactRole, description: next.description });
      notifyProducerProfileChanged();
      toast("공연사 정보를 저장했습니다.");
    } catch (cause) {
      setFormError(errorMessage(cause, "공연사 정보를 저장하지 못했습니다."));
    } finally {
      setSaving(false);
    }
  };

  return <div className="mx-auto max-w-[920px] px-5 py-9 md:px-8 md:py-12"><header><div className="flex flex-wrap items-center gap-3"><p className="text-sm font-semibold text-brand">공연사 설정</p><VerificationBadge status={profile.verificationStatus} /></div><h1 className="mt-2 text-[clamp(28px,4vw,38px)] font-bold tracking-[-0.035em]">공개 정보와 담당자를 관리하세요.</h1><p className="mt-3 max-w-2xl leading-7 text-muted-strong">공연사명과 소개는 공개 공고에도 표시됩니다. 인증의 근거가 되는 사업자 정보는 별도 재인증 없이는 바꿀 수 없어요.</p></header>
    <form onSubmit={submit} className="mt-8 space-y-5">
      <section className="rounded-card border border-border bg-card p-5 md:p-6"><h2 className="text-lg font-bold">표시 정보</h2><div className="mt-5 grid gap-4 md:grid-cols-2"><SettingsField label="공연사명"><FieldInput required value={companyName} onChange={(event) => setCompanyName(event.target.value)} /></SettingsField><SettingsField label="담당자명"><FieldInput required value={contactName} onChange={(event) => setContactName(event.target.value)} /></SettingsField><SettingsField label="담당 업무"><FieldInput value={contactRole} onChange={(event) => setContactRole(event.target.value)} placeholder="예: 캐스팅 담당" /></SettingsField><div className="md:col-span-2"><SettingsField label="공연사 소개" hint={`${description.length} / 200자 · 공개 공고에 표시`}><FieldTextarea value={description} maxLength={200} onChange={(event) => setDescription(event.target.value)} className="min-h-28 resize-y" /></SettingsField></div></div></section>
      <section className="rounded-card border border-border bg-surface p-5 md:p-6"><h2 className="text-lg font-bold">인증 및 계정 정보</h2><p className="mt-2 text-sm leading-6 text-muted">운영진이 확인한 값이므로 이 화면에서는 수정할 수 없습니다.</p><dl className="mt-5 grid gap-4 text-sm md:grid-cols-2"><ReadOnly label="로그인 이메일" value={profile.email} /><ReadOnly label="사업자등록번호" value={profile.businessNumber} /><ReadOnly label="대표자명" value={profile.representativeName} /><ReadOnly label="인증 완료일" value={profile.verifiedAt ? new Intl.DateTimeFormat("ko-KR", { dateStyle: "long" }).format(new Date(profile.verifiedAt)) : "인증 대기 중"} /></dl></section>
      {formError ? <p role="alert" className="rounded-control border border-fail/20 bg-fail-bg px-4 py-3 text-sm font-medium text-fail">{formError}</p> : null}
      <div className="flex justify-end"><PrimaryButton type="submit" disabled={!changed || saving}>{saving ? "저장 중…" : "변경 사항 저장"}</PrimaryButton></div>
    </form>
  </div>;
}

function SettingsField({ label, hint, children }: { readonly label: string; readonly hint?: string; readonly children: React.ReactNode }) { return <label className="block"><span className="mb-1.5 flex items-center gap-2 text-sm font-semibold text-muted-strong">{label}{hint ? <small className="ml-auto font-normal text-muted">{hint}</small> : null}</span>{children}</label>; }
function ReadOnly({ label, value }: { readonly label: string; readonly value: string }) { return <div><dt className="text-muted">{label}</dt><dd className="num mt-1 font-semibold text-foreground">{value}</dd></div>; }
function VerificationBadge({ status }: { readonly status: ProducerProfile["verificationStatus"] }) { const label = status === "VERIFIED" ? "인증 완료" : status === "PENDING" ? "인증 대기" : "재확인 필요"; return <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${status === "VERIFIED" ? "border-pass/20 bg-pass-bg text-pass" : "border-warn-bg bg-warn-bg text-warn"}`}>{label}</span>; }
function SettingsSkeleton() { return <div className="mx-auto max-w-[920px] animate-pulse px-5 py-9 md:px-8"><div className="h-10 w-72 rounded bg-border" /><div className="mt-10 h-80 rounded-card bg-border-soft" /></div>; }

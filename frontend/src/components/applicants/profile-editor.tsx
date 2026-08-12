"use client";

import { useState } from "react";
import { updateApplicantProfile } from "@/features/applicants/api";
import type { ApplicantAnswerValue, ApplicantProfileResponse } from "@/features/applicants/types";
import { APPLICATION_FIELD_OPTIONS } from "@/features/auditions/creation-types";
import type { ApplicationFieldSection } from "@/features/auditions/creation-types";
import { useToast } from "@/components/auditions/toast";
import { DestructiveButton, PrimaryButton, SecondaryButton } from "@/components/ui/controls";
import { ProfileSectionPanel } from "./profile-editor-sections";

type ProfileTab = ApplicationFieldSection;
type DraftValues = Record<string, ApplicantAnswerValue>;

const tabs: readonly { id: ProfileTab; label: string; description: string }[] = [
  { id: "BASIC", label: "기본 정보", description: "연락처와 신체 정보" },
  { id: "CAREER", label: "경력", description: "공연과 활동 이력" },
  { id: "MATERIALS", label: "사진·영상", description: "재사용할 지원 자료" },
  { id: "INTRODUCTION", label: "소개", description: "자기소개와 지원 동기" },
  { id: "CUSTOM", label: "추가 답변", description: "공고별 질문 기록" },
] as const;

export function ProfileEditor({ profile, onSaved }: { readonly profile: ApplicantProfileResponse; readonly onSaved: (profile: ApplicantProfileResponse) => void }) {
  const toast = useToast();
  const initial = Object.fromEntries(profile.answers.map((answer) => [answer.key, answer.value])) as DraftValues;
  const labels = new Map(profile.answers.map((answer) => [answer.key, answer.label]));
  const [activeTab, setActiveTab] = useState<ProfileTab>("BASIC");
  const [values, setValues] = useState<DraftValues>(initial);
  const [removed, setRemoved] = useState<ReadonlySet<string>>(new Set());
  const [pendingRemoval, setPendingRemoval] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const customAnswers = profile.answers.filter((answer) => answer.custom);
  const standardFields = APPLICATION_FIELD_OPTIONS.map((field) => ({
    id: field.key,
    key: field.key,
    label: field.label,
    enabled: true,
    required: false,
    custom: false,
    section: field.section,
    inputType: field.inputType,
    order: field.order,
    layout: field.layout,
    config: field.config,
  }));
  const changedKeys = Object.keys(values).filter((key) => !removed.has(key) && JSON.stringify(values[key]) !== JSON.stringify(initial[key]) && hasValue(values[key]));
  const clearedKeys = Object.keys(initial).filter((key) => !removed.has(key) && !hasValue(values[key]));
  const removeKeys = [...new Set([...removed, ...clearedKeys])];
  const changeCount = changedKeys.length + removeKeys.length;

  const save = async () => {
    if (!changeCount) return;
    setSaving(true);
    setError("");
    try {
      const next = await updateApplicantProfile({
        answers: changedKeys.map((key) => ({ key, label: labels.get(key) ?? standardFields.find((field) => field.id === key)?.label, value: values[key]! })),
        removeKeys,
      });
      toast("프로필을 저장했어요. 다음 지원서의 미리 채우기에 사용됩니다.", { type: "success" });
      onSaved(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "프로필을 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const confirmRemoval = () => {
    if (!pendingRemoval) return;
    setRemoved((current) => new Set([...current, pendingRemoval]));
    setPendingRemoval(null);
  };

  return <div className="mt-9 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
    <nav aria-label="프로필 항목" className="scrollbar-compact flex snap-x snap-proximity gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">{tabs.map((tab) => {
      const active = activeTab === tab.id;
      const fields = tab.id === "CUSTOM" ? customAnswers.map((answer) => ({ id: answer.key })) : standardFields.filter((field) => field.section === tab.id);
      const filled = fields.filter((field) => !removed.has(field.id) && hasValue(values[field.id])).length;
      return <button key={tab.id} type="button" aria-current={active ? "page" : undefined} onClick={() => setActiveTab(tab.id)} className={`min-h-14 min-w-36 shrink-0 snap-start rounded-control border px-4 py-3 text-left transition-colors lg:min-w-0 ${active ? "border-brand bg-brand-soft text-brand" : "border-border bg-card text-muted-strong hover:border-brand-line hover:bg-brand-soft"}`}><span className="flex items-center justify-between gap-2"><strong className="text-sm">{tab.label}</strong><span className="num text-xs">{filled}/{fields.length}</span></span><span className="mt-1 hidden text-xs lg:block">{tab.description}</span></button>;
    })}</nav>
    <section className="min-w-0 rounded-card border border-border bg-card p-5 md:p-7">
      <div className="border-b border-border-soft pb-5"><h2 className="text-xl font-bold">{tabs.find((tab) => tab.id === activeTab)?.label}</h2><p className="mt-2 text-sm leading-6 text-muted">프로필에는 필수 항목이 없어요. 필요한 정보만 저장하고, 공고별 필수 여부는 지원할 때 확인합니다.</p></div>
      <ProfileSectionPanel section={activeTab} fields={standardFields} profile={profile} values={values} removed={removed} onChange={(key, value) => { setValues((current) => ({ ...current, [key]: value })); setRemoved((current) => { const next = new Set(current); next.delete(key); return next; }); setError(""); }} onRequestRemove={setPendingRemoval} />
      {error ? <p role="alert" className="mt-5 rounded-control border border-fail/25 bg-fail-bg px-4 py-3 text-sm font-medium text-fail">{error}</p> : null}
      <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-border-soft pt-5"><p className="min-w-0 flex-1 text-sm text-muted-strong">{changeCount ? `${changeCount}개 변경 사항이 있어요.` : "모든 변경 사항이 저장되어 있어요."}</p><PrimaryButton onClick={save} disabled={saving || !changeCount} className="min-h-12 px-5">{saving ? "저장 중…" : "프로필 저장"}</PrimaryButton></div>
    </section>
    {pendingRemoval ? <div role="dialog" aria-modal="true" aria-labelledby="profile-remove-title" className="fixed inset-0 z-50 grid place-items-center bg-black/55 p-5"><section className="w-full max-w-md rounded-modal bg-card p-6 shadow-[var(--shadow-modal)]"><h2 id="profile-remove-title" className="text-xl font-bold">이 답변을 프로필에서 지울까요?</h2><p className="mt-3 text-sm leading-6 text-muted-strong">이미 제출한 지원서에는 영향이 없고, 다음 지원서부터 자동으로 채워지지 않습니다.</p><div className="mt-6 flex justify-end gap-2"><SecondaryButton onClick={() => setPendingRemoval(null)}>취소</SecondaryButton><DestructiveButton onClick={confirmRemoval}>프로필에서 삭제</DestructiveButton></div></section></div> : null}
  </div>;
}

function hasValue(value: ApplicantAnswerValue | undefined) {
  if (value === undefined) return false;
  if (typeof value === "string") return Boolean(value.trim());
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

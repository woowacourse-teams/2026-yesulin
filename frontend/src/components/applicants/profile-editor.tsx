"use client";

import { useState } from "react";
import { updateApplicantProfile } from "@/features/applicants/api";
import { notifyApplicantProfileChanged } from "@/features/applicants/events";
import type { ApplicantAnswerValue, ApplicantProfileResponse, BodyMeasurements } from "@/features/applicants/types";
import { APPLICATION_FIELD_OPTIONS } from "@/features/auditions/creation-types";
import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import { useToast } from "@/components/auditions/toast";
import { PrimaryButton } from "@/components/ui/controls";
import { ProfileInformationSection } from "./profile-editor-sections";
import { ProfilePhotoLibrary } from "./profile-photo-library";
import { ProfileVideoLibrary } from "./profile-video-library";

type ProfileTab = "BASIC" | "ADDITIONAL" | "PHOTOS" | "VIDEOS";
type DraftValues = Record<string, ApplicantAnswerValue>;

const BASIC_KEYS = ["NAME", "BODY", "BIRTH", "GENDER", "PHONE", "EMAIL", "ADDRESS"] as const;
const ADDITIONAL_KEYS = ["SCHOOL", "CAREER", "LINK", "NATIONALITY", "COVER_LETTER", "SPECIALTY", "HOBBIES", "MILITARY"] as const;
const INFORMATION_KEYS = new Set<string>([...BASIC_KEYS, ...ADDITIONAL_KEYS]);
const tabs: readonly { id: ProfileTab; label: string; description: string }[] = [
  { id: "BASIC", label: "기본정보", description: "필수 프로필 정보" },
  { id: "ADDITIONAL", label: "추가정보", description: "선택해서 저장하는 정보" },
  { id: "PHOTOS", label: "사진", description: "최대 20장 보관" },
  { id: "VIDEOS", label: "영상", description: "YouTube 영상 보관" },
];

const standardFields: readonly ApplicationFieldInput[] = APPLICATION_FIELD_OPTIONS.map((field) => ({
  id: field.key, key: field.key, label: field.label, enabled: true, required: field.section === "BASIC", custom: false,
  section: field.section, inputType: field.inputType, order: field.order, layout: field.layout, config: field.config,
}));

export function ProfileEditor({ profile, onSaved }: { readonly profile: ApplicantProfileResponse; readonly onSaved: (profile: ApplicantProfileResponse) => void }) {
  const toast = useToast();
  const initial = Object.fromEntries(profile.answers.filter((answer) => INFORMATION_KEYS.has(answer.key)).map((answer) => [answer.key, answer.value])) as DraftValues;
  const labels = new Map(profile.answers.map((answer) => [answer.key, answer.label]));
  const [activeTab, setActiveTab] = useState<ProfileTab>("BASIC");
  const [values, setValues] = useState<DraftValues>(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const changedKeys = [...INFORMATION_KEYS].filter((key) => hasValue(values[key]) && JSON.stringify(values[key]) !== JSON.stringify(initial[key]));
  const removeKeys = [...INFORMATION_KEYS].filter((key) => hasValue(initial[key]) && !hasValue(values[key]));
  const changeCount = changedKeys.length + removeKeys.length;
  const basicFields = fieldsFor(BASIC_KEYS);
  const additionalFields = fieldsFor(ADDITIONAL_KEYS);

  const save = async () => {
    if (!changeCount) return;
    if (basicFilled(values) < 8) { setError("기본정보의 필수 항목 8개를 모두 입력해 주세요."); return; }
    setSaving(true);
    setError("");
    try {
      const next = await updateApplicantProfile({
        answers: changedKeys.map((key) => ({ key, label: labels.get(key) ?? standardFields.find((field) => field.id === key)?.label, value: values[key]! })),
        removeKeys,
      });
      toast("프로필 정보를 저장했어요. 다음 지원서의 미리 채우기에 사용됩니다.", { type: "success" });
      notifyApplicantProfileChanged();
      onSaved(next);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "프로필 정보를 저장하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const tabCount = (tab: ProfileTab) => {
    if (tab === "BASIC") return `${basicFilled(values)}/8`;
    if (tab === "ADDITIONAL") return `${ADDITIONAL_KEYS.filter((key) => hasValue(values[key])).length}/8`;
    if (tab === "PHOTOS") return `${profile.photoLibrary.length}/20`;
    return `${profile.videoLibrary.length}/10`;
  };
  const change = (key: string, value: ApplicantAnswerValue) => { setValues((current) => ({ ...current, [key]: value })); setError(""); };
  const informationTab = activeTab === "BASIC" || activeTab === "ADDITIONAL";

  return <div className="mt-9 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
    <nav aria-label="프로필 항목" className="scrollbar-compact flex snap-x snap-proximity gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">{tabs.map((tab) => {
      const active = activeTab === tab.id;
      return <button key={tab.id} type="button" aria-current={active ? "page" : undefined} onClick={() => { setActiveTab(tab.id); setError(""); }} className={`min-h-14 min-w-36 shrink-0 snap-start rounded-control border px-4 py-3 text-left transition-colors lg:min-w-0 ${active ? "border-brand bg-brand-soft text-brand" : "border-border bg-card text-muted-strong hover:border-brand-line hover:bg-brand-soft"}`}><span className="flex items-center justify-between gap-2"><strong className="text-sm">{tab.label}</strong><span className="num text-xs">{tabCount(tab.id)}</span></span><span className="mt-1 hidden text-xs lg:block">{tab.description}</span></button>;
    })}</nav>
    <section className="min-w-0 rounded-card border border-border bg-card p-5 md:p-7">
      <div className="border-b border-border-soft pb-5"><h2 className="text-xl font-bold">{tabs.find((tab) => tab.id === activeTab)?.label}</h2><p className="mt-2 text-sm leading-6 text-muted">{activeTab === "BASIC" ? "지원서에 공통으로 사용하는 필수 정보예요." : activeTab === "ADDITIONAL" ? "필요한 항목만 저장하면 공고에서 요청할 때 자동으로 채워집니다." : "추가·삭제·순서 변경 내용은 즉시 저장됩니다."}</p></div>
      {activeTab === "BASIC" ? <ProfileInformationSection tab="BASIC" fields={basicFields} values={values} onChange={change} /> : null}
      {activeTab === "ADDITIONAL" ? <ProfileInformationSection tab="ADDITIONAL" fields={additionalFields} values={values} onChange={change} /> : null}
      {activeTab === "PHOTOS" ? <ProfilePhotoLibrary profile={profile} onSaved={onSaved} /> : null}
      {activeTab === "VIDEOS" ? <ProfileVideoLibrary profile={profile} onSaved={onSaved} /> : null}
      {error ? <p role="alert" className="mt-5 rounded-control border border-fail/25 bg-fail-bg px-4 py-3 text-sm font-medium text-fail">{error}</p> : null}
      {informationTab ? <div className="mt-7 flex flex-wrap items-center gap-3 border-t border-border-soft pt-5"><p className="min-w-0 flex-1 text-sm text-muted-strong">{changeCount ? `${changeCount}개 변경 사항이 있어요.` : "모든 변경 사항이 저장되어 있어요."}</p><PrimaryButton onClick={save} disabled={saving || !changeCount} className="min-h-12 px-5">{saving ? "저장 중…" : "프로필 저장"}</PrimaryButton></div> : null}
    </section>
  </div>;
}

function fieldsFor(keys: readonly string[]) { return keys.flatMap((key) => standardFields.find((field) => field.id === key) ?? []); }
function hasValue(value: ApplicantAnswerValue | undefined) { if (value === undefined) return false; if (typeof value === "string") return Boolean(value.trim()); if (Array.isArray(value)) return value.length > 0; return true; }
function basicFilled(values: DraftValues) {
  const body = values.BODY;
  const bodyValue = typeof body === "object" && body !== null && !Array.isArray(body) ? body as BodyMeasurements : undefined;
  return [values.NAME, bodyValue?.height, bodyValue?.weight, values.BIRTH, values.GENDER, values.PHONE, values.EMAIL, values.ADDRESS].filter((value) => typeof value === "number" ? value > 0 : typeof value === "string" && value.trim().length > 0).length;
}

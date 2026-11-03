"use client";

import { useEffect } from "react";
import { clearPdfApplied, trackPdfProfileSaved } from "@/features/analytics/pdf-analytics";
import { useRef, useState } from "react";
import { updateApplicantProfile } from "@/features/applicants/api";
import { notifyApplicantProfileChanged } from "@/features/applicants/events";
import { integerMeasurementError, isIntegerMeasurement, isValidEmail, isValidKoreanPhone, profileBirthDateError } from "@/features/applicants/profile-input";
import type { ApplicantProfileValues } from "@/features/applicants/profile-contract";
import type { ApplicantAnswerValue, ApplicantProfileResponse } from "@/features/applicants/types";
import { APPLICATION_FIELD_OPTIONS } from "@/features/auditions/creation-types";
import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import { useToast } from "@/components/auditions/toast";
import { PrimaryButton, SecondaryButton } from "@/components/ui/controls";
import { ActorPagePublishDialog } from "@/components/actor-pages/actor-page-publish-dialog";
import { ActorPageInlinePreview } from "@/components/actor-pages/actor-page-inline-preview";
import { ActorPagePublished } from "@/components/actor-pages/actor-page-published";
import { ActorPageSettingsPanel, publishedActorPageToast, useActorPageSettings } from "@/components/actor-pages/actor-page-settings";
import { recordActorPagePublishPrompt, type PublishedActorPage } from "@/features/actor-pages/owner-api";
import { shouldPromptPublish, type ActorPageSettings } from "@/features/actor-pages/settings";
import { reloadApplicantProfilePhotos } from "@/features/applicants/profile-photo-api";
import { ProfileInformationSection } from "./profile-editor-sections";
import { ProfileImport } from "./profile-import";
import { MAX_LIBRARY_PHOTOS, ProfilePhotoLibrary } from "./profile-photo-library";
import { MAX_LIBRARY_VIDEOS, ProfileVideoLibrary } from "./profile-video-library";

export type ProfileTab = "BASIC" | "ADDITIONAL" | "PHOTOS" | "VIDEOS" | "ACTOR_PAGE";
type DraftValues = Record<string, ApplicantAnswerValue>;

const BASIC_KEYS = ["NAME", "HEIGHT", "WEIGHT", "BIRTH", "GENDER", "PHONE", "EMAIL", "ADDRESS"] as const;
const ADDITIONAL_KEYS = ["SCHOOL", "LINK", "NATIONALITY", "MILITARY", "SPECIALTY", "HOBBIES", "COVER_LETTER", "CAREER"] as const;
const INFORMATION_KEYS = new Set<string>([...BASIC_KEYS, ...ADDITIONAL_KEYS]);
const MEASUREMENT_KEYS = ["HEIGHT", "WEIGHT"] as const;
const MEASUREMENT_LABELS: Record<(typeof MEASUREMENT_KEYS)[number], string> = { HEIGHT: "키", WEIGHT: "몸무게" };
const tabs: readonly { id: ProfileTab; label: string; description: string }[] = [
  { id: "BASIC", label: "기본정보", description: "1. 이름·생년월일·성별" },
  { id: "PHOTOS", label: "사진", description: "2. 프로필 사진 추가" },
  { id: "ACTOR_PAGE", label: "배우 페이지", description: "3. 아이디 정하고 공개" },
  { id: "ADDITIONAL", label: "추가정보", description: "선택 · 경력·자기소개 등" },
  { id: "VIDEOS", label: "영상", description: "선택 · YouTube 영상" },
];

const standardFields: readonly ApplicationFieldInput[] = APPLICATION_FIELD_OPTIONS.map((field) => ({
  id: field.key, key: field.key, label: field.label, enabled: true, required: field.section === "BASIC", custom: false,
  section: field.section, inputType: field.inputType, order: field.order, layout: field.layout, config: field.config,
}));

export function ProfileEditor({ profile, onSaved, initialTab = "BASIC", onCompletionChange }: { readonly profile: ApplicantProfileResponse; readonly onSaved: (profile: ApplicantProfileResponse) => void; readonly initialTab?: ProfileTab; readonly onCompletionChange?: (completed: boolean) => void }) {
  const toast = useToast();
  const actorPage = useActorPageSettings();
  const [publishPrompt, setPublishPrompt] = useState<ActorPageSettings | null>(null);
  const [published, setPublished] = useState<PublishedActorPage | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const editScroll = useRef(0);
  const previewScroll = useRef(0);
  const initial = informationValues(profile);
  const [activeTab, setActiveTab] = useState<ProfileTab>(initialTab);
  const [values, setValues] = useState<DraftValues>(initial);
  const draftRef = useRef(values);
  const [saving, setSaving] = useState(false);
  const saveInFlight = useRef(false);
  useEffect(() => () => clearPdfApplied(), []);
  const [error, setError] = useState("");
  const [invalidField, setInvalidField] = useState<string | null>(null);
  const changeCount = changedInformationCount(values, initial);
  const basicFields = fieldsFor(BASIC_KEYS);
  const additionalFields = fieldsFor(ADDITIONAL_KEYS);

  const openTab = (tab: ProfileTab) => {
    setActiveTab(tab);
    setError("");
    requestAnimationFrame(() => document.getElementById("profile-section-title")?.focus());
  };
  const invalidBasic = (key: string, message: string) => {
    setActiveTab("BASIC");
    setInvalidField(key);
    setError(message);
    requestAnimationFrame(() => {
      const input = document.getElementById(`profile-${key}`);
      const details = input?.closest("details");
      if (details) details.open = true;
      input?.focus();
    });
  };
  const save = async (nextTab?: ProfileTab) => {
    if (saveInFlight.current) return;
    if (!changeCount) { if (nextTab) openTab(nextTab); return; }
    const birthError = profileBirthDateError(typeof values.BIRTH === "string" ? values.BIRTH : "");
    if (birthError) {
      invalidBasic("BIRTH", birthError);
      return;
    }
    if (typeof values.PHONE === "string" && values.PHONE.trim() && !isValidKoreanPhone(values.PHONE)) { invalidBasic("PHONE", "연락처를 확인해 주세요. 예: 010-1234-5678"); return; }
    if (typeof values.EMAIL === "string" && values.EMAIL.trim() && !isValidEmail(values.EMAIL)) { invalidBasic("EMAIL", "이메일 주소 형식을 확인해 주세요. 예: actor@example.com"); return; }
    const decimalMeasurement = MEASUREMENT_KEYS.find((key) => {
      const value = values[key];
      return (typeof value === "number" || typeof value === "string") && !isIntegerMeasurement(value);
    });
    if (decimalMeasurement) { invalidBasic(decimalMeasurement, integerMeasurementError(MEASUREMENT_LABELS[decimalMeasurement])); return; }
    saveInFlight.current = true;
    setSaving(true);
    setError("");
    try {
      const normalized = Object.fromEntries(
        [...INFORMATION_KEYS].map((key) => [key, normalizedValue(key, values[key])]),
      ) as ApplicantProfileValues;
      const next = await updateApplicantProfile(normalized, profile);
      trackPdfProfileSaved();
      toast("프로필 정보를 저장했어요. 다음 지원서의 미리 채우기에 사용됩니다.", { type: "success" });
      notifyApplicantProfileChanged();
      onSaved(next);
      if (nextTab) { await actorPage.refresh(); openTab(nextTab); }
      else void promptPublishOnce(next);
    } catch (cause) {
      console.error("[배우 프로필 저장 실패]", cause);
      setError(cause instanceof Error ? cause.message : "프로필 정보를 저장하지 못했습니다.");
    } finally {
      saveInFlight.current = false;
      setSaving(false);
    }
  };

  /** 저장으로 공개 조건이나 자동 비공개가 바뀌었을 수 있어 설정을 다시 읽고, 처음 한 번만 공개 팝업을 띄운다. */
  const promptPublishOnce = async (saved: ApplicantProfileResponse) => {
    const savedValues = informationValues(saved);
    if (changedInformationCount(draftRef.current, savedValues)) return;
    const latest = await actorPage.refresh();
    if (!latest || !shouldPromptPublish(latest) || changedInformationCount(draftRef.current, savedValues)) return;
    setPublishPrompt(latest);
    try {
      await recordActorPagePublishPrompt();
      actorPage.update({ ...latest, publishPromptShown: true });
    } catch (cause) {
      console.error("[배우 페이지 공개 팝업 기록 실패]", cause);
    }
  };
  const libraryChanged = (next: ApplicantProfileResponse) => { onSaved(next); void actorPage.refresh(); };
  const updateDraft = (update: (current: DraftValues) => DraftValues) => {
    const next = update(draftRef.current);
    draftRef.current = next;
    setValues(next);
  };
  /** PDF에서 고른 값은 입력란에만 넣는다. 저장은 다른 변경과 같이 '프로필 저장'으로 한다. */
  const applyImport = (updates: Readonly<DraftValues>, needsCareerInput: boolean) => {
    updateDraft((current) => ({ ...current, ...updates }));
    setError("");
    setActiveTab(needsCareerInput || !BASIC_KEYS.some((key) => key in updates) ? "ADDITIONAL" : "BASIC");
    toast(needsCareerInput
      ? "고른 값을 입력란에 넣었어요. 빈 경력 연도·배역을 채운 뒤 '프로필 저장'을 눌러 주세요."
      : "고른 값을 입력란에 넣었어요. '프로필 저장'을 눌러야 저장돼요.", { type: "success" });
  };
  const importedPhotoAdded = async () => {
    try {
      libraryChanged(await reloadApplicantProfilePhotos(profile));
    } catch (cause) {
      console.error("[사진 보관함 다시 읽기 실패]", cause);
    }
  };

  const tabCount = (tab: ProfileTab) => {
    if (tab === "ACTOR_PAGE") return actorPage.settings ? actorPage.settings.locked ? "잠김" : actorPage.settings.status === "PUBLIC" ? "공개" : "비공개" : "";
    if (tab === "BASIC") return `${pageBasicsFilled(values)}/3`;
    if (tab === "ADDITIONAL") return `${ADDITIONAL_KEYS.filter((key) => hasValue(values[key])).length}/8`;
    if (tab === "PHOTOS") return `${profile.photoLibrary.length}/${MAX_LIBRARY_PHOTOS}`;
    return `${profile.videoLibrary.length}/${MAX_LIBRARY_VIDEOS}`;
  };
  const change = (key: string, value: ApplicantAnswerValue) => { updateDraft((current) => ({ ...current, [key]: value })); setError(""); };
  const informationTab = activeTab === "BASIC" || activeTab === "ADDITIONAL";
  const showPreview = (show: boolean) => {
    if (show === previewOpen) return;
    if (show) editScroll.current = window.scrollY;
    else previewScroll.current = window.scrollY;
    setPreviewOpen(show);
    requestAnimationFrame(() => {
      if (window.matchMedia("(max-width: 1100px)").matches) window.scrollTo({ top: show ? previewScroll.current : editScroll.current, behavior: "instant" });
      document.getElementById(show ? "profile-preview-title" : "profile-section-title")?.focus({ preventScroll: true });
    });
  };
  const publicationComplete = (result: PublishedActorPage) => {
    if (result.settings.status === "PUBLIC" && result.settings.handle) {
      setPreviewOpen(false);
      setPublished(result);
      onCompletionChange?.(true);
      window.scrollTo({ top: 0, behavior: "instant" });
    }
  };
  const returnToEditor = (tab?: ProfileTab) => {
    setPublished(null);
    onCompletionChange?.(false);
    if (tab) setActiveTab(tab);
    requestAnimationFrame(() => document.getElementById("profile-section-title")?.focus());
  };

  if (published) return <ActorPagePublished result={published} onEdit={() => returnToEditor()} onPhotos={() => returnToEditor("PHOTOS")} />;

  return <div className="profile-composer" data-preview={previewOpen}>
    <div className="profile-composer-toolbar" role="group" aria-label="작성 화면 보기">
      <button type="button" aria-pressed={!previewOpen} onClick={() => showPreview(false)}>정보 입력</button>
      <button type="button" aria-pressed={previewOpen} onClick={() => showPreview(true)}>페이지 미리보기</button>
    </div>
    <div className="profile-composer-body">
    <div className="applicant-profile-editor profile-composer-edit">
    <nav aria-label="프로필 항목" className="applicant-profile-tabs">{tabs.map((tab) => {
      const active = activeTab === tab.id;
      return <button key={tab.id} type="button" aria-current={active ? "page" : undefined} data-optional={tab.id === "ADDITIONAL" || tab.id === "VIDEOS" ? "true" : undefined} onClick={() => openTab(tab.id)} className="applicant-profile-tab"><span className="flex items-center justify-between gap-2"><strong className="text-sm">{tab.label}</strong><span className="num text-xs">{tabCount(tab.id)}</span></span><span className="mt-1 text-xs">{tab.description}</span></button>;
    })}</nav>
    <section className="workspace-panel min-w-0">
      <div className="flex flex-wrap items-start gap-3 border-b border-border-soft pb-5"><div className="min-w-0 flex-1"><h2 id="profile-section-title" tabIndex={-1} className="text-xl font-bold outline-none">{tabs.find((tab) => tab.id === activeTab)?.label}</h2><p className="mt-2 text-sm leading-6 text-muted">{activeTab === "BASIC" ? "이름·생년월일·성별부터 입력하세요. 작성한 항목만 저장할 수 있어요." : activeTab === "ADDITIONAL" ? "필요할 때 천천히 채워도 괜찮아요. 프로필에 저장한 내용은 다음 지원서에 활용할 수 있어요." : activeTab === "ACTOR_PAGE" ? "아이디와 공개할 사진을 고른 뒤 내 페이지를 공개해 보세요." : "추가·삭제·순서 변경 내용은 즉시 저장됩니다."}</p></div>{informationTab ? <ProfileImport values={values} photoCount={profile.photoLibrary.length} onApply={applyImport} onPhotoAdded={importedPhotoAdded} /> : null}</div>
      {activeTab === "BASIC" ? <ProfileInformationSection tab="BASIC" fields={basicFields} values={values} onChange={change} invalidField={invalidField} /> : null}
      {activeTab === "ADDITIONAL" ? <ProfileInformationSection tab="ADDITIONAL" fields={additionalFields} values={values} onChange={change} invalidField={invalidField} /> : null}
      {activeTab === "PHOTOS" ? <ProfilePhotoLibrary profile={profile} onSaved={libraryChanged} onContinue={() => openTab("ACTOR_PAGE")} pagePublic={actorPage.settings?.status === "PUBLIC"} /> : null}
      {activeTab === "VIDEOS" ? <ProfileVideoLibrary profile={profile} onSaved={libraryChanged} /> : null}
      {activeTab === "ACTOR_PAGE" ? <>
        {changeCount > 0 ? <div role="status" className="mt-5 rounded-control border border-brand-line bg-brand-soft p-4"><p className="text-sm leading-6">저장하지 않은 프로필 정보가 있어요. 공개하기 전에 저장해 주세요. 미리보기에는 저장된 내용만 보여요.</p><SecondaryButton disabled={saving} onClick={() => void save("ACTOR_PAGE")} className="mt-3">{saving ? "저장 중…" : "프로필 저장 후 계속"}</SecondaryButton></div> : null}
        <ActorPageSettingsPanel profile={profile} actorPage={actorPage} onProfileChange={onSaved} hasUnsavedChanges={changeCount > 0} onAddPhotos={() => openTab("PHOTOS")} onPreview={() => showPreview(true)} onPublished={publicationComplete} onEditBasic={(key) => { setActiveTab("BASIC"); requestAnimationFrame(() => document.getElementById(`profile-${key}`)?.focus()); }} />
      </> : null}
      {error ? <p role="alert" className="mt-5 rounded-control border border-fail/25 bg-fail-bg px-4 py-3 text-sm font-medium text-fail">{error}</p> : null}
      {informationTab ? <div className="profile-save-actions mt-7 flex flex-wrap items-center gap-3 border-t border-border-soft pt-5"><p className="min-w-0 flex-1 text-sm text-muted-strong" role="status">{changeCount ? `${changeCount}개 변경 사항이 있어요.` : "모든 변경 사항이 저장되어 있어요."}</p><div className="flex flex-wrap gap-2"><SecondaryButton onClick={() => void save()} disabled={saving || !changeCount} className="min-h-12 px-5">{saving ? "저장 중…" : "프로필 저장"}</SecondaryButton>{activeTab === "BASIC" ? <PrimaryButton onClick={() => void save("PHOTOS")} disabled={saving} className="min-h-12 px-5">{changeCount ? "저장하고 사진으로" : "다음: 사진 추가"}</PrimaryButton> : null}</div></div> : null}
    </section>
    </div>
    {previewOpen ? <ActorPageInlinePreview profile={profile} settings={actorPage.settings} unsaved={changeCount > 0} /> : null}
    </div>
    {publishPrompt && changeCount === 0 ? <ActorPagePublishDialog
      mode="prompt"
      settings={publishPrompt}
      profile={profile}
      onClose={() => setPublishPrompt(null)}
      onOpenSettings={() => { setPublishPrompt(null); setActiveTab("ACTOR_PAGE"); setError(""); }}
      onPublished={(result) => {
        setPublishPrompt(null);
        actorPage.update(result.settings);
        onSaved(result.profile);
        notifyApplicantProfileChanged();
        publishedActorPageToast(toast, result);
        publicationComplete(result);
      }}
    /> : null}
  </div>;
}

function fieldsFor(keys: readonly string[]) { return keys.flatMap((key) => standardFields.find((field) => field.id === key) ?? []); }
function informationValues(profile: ApplicantProfileResponse) { return Object.fromEntries(profile.answers.filter((answer) => INFORMATION_KEYS.has(answer.key)).map((answer) => [answer.key, answer.value])) as DraftValues; }
function changedInformationCount(values: DraftValues, initial: DraftValues) {
  return [...INFORMATION_KEYS].filter((key) => {
    const value = normalizedValue(key, values[key]);
    const previous = normalizedValue(key, initial[key]);
    return hasValue(value) ? JSON.stringify(value) !== JSON.stringify(previous) : hasValue(previous);
  }).length;
}
function normalizedValue(key: string, value: ApplicantAnswerValue | undefined) { if (key === "LINK" && Array.isArray(value)) return value.filter((item): item is string => typeof item === "string" && Boolean(item.trim())).map((item) => item.trim()).slice(0, 5); return value; }
function hasValue(value: ApplicantAnswerValue | undefined) { if (value === undefined) return false; if (typeof value === "string") return Boolean(value.trim()); if (Array.isArray(value)) return value.length > 0; return true; }
function pageBasicsFilled(values: DraftValues) {
  return ["NAME", "BIRTH", "GENDER"].filter((key) => hasValue(values[key])).length;
}

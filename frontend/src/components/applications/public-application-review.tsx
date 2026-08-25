"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import { orderedApplicationPhotos, youtubeVideoId } from "@/features/applications/application-form-state";
import type { ApplicationPhoto, CareerDraft, SubmissionState } from "@/features/applications/application-form-state";
import { photoSlotLabels } from "@/features/applications/materials";
import { buildApplicationAuthReturnTo } from "@/features/auth/return-to";
import { PrimaryButton, TextButton } from "@/components/ui/controls";
import { isBackendAuditionId } from "@/features/auditions/audition-v1-api";
import { usePublicApplication } from "./public-application-context";
import { PublicApplicationSaveBadge, PublicApplicationSaveNotice } from "./public-application-save-status";
import { ModalShell } from "@/components/auditions/modal-shell";
import type { EditableSection } from "./public-application-context-types";

const REVIEW_SECTIONS = ["BASIC", "ADDITIONAL", "INTRODUCTION", "MATERIALS", "CAREER", "CUSTOM"] as const;
const REVIEW_SECTION_TITLES: Record<EditableSection, string> = {
  BASIC: "기본 정보",
  ADDITIONAL: "추가 정보",
  INTRODUCTION: "자기소개",
  MATERIALS: "사진과 영상",
  CAREER: "경력",
  CUSTOM: "추가 질문",
};

export function PublicApplicationReview() {
  const { state, actions, meta } = usePublicApplication();
  const submitting = state.submissionState === "SUBMITTING";
  return <main className="min-h-screen bg-surface pb-12 text-foreground">
    <header className="glass-surface sticky top-0 z-20 border-x-0 border-t-0"><div className="mx-auto flex min-h-16 max-w-[880px] items-center px-5 md:px-8"><span className="text-sm font-semibold text-brand">지원서 검토</span><PublicApplicationSaveBadge /></div></header>
    <div className="mx-auto max-w-[880px] px-5 py-8 md:px-8 md:py-12">
      <PublicApplicationSaveNotice />
      <p className="text-sm font-semibold text-brand">마지막 확인</p>
      <h1 className="mt-2 text-2xl font-bold tracking-[-0.025em] md:text-[28px]">확인하고, 인증한 뒤 제출하세요.</h1>
      <p className="mt-3 leading-6 text-muted-strong">작성 내용을 점검하고 필수 동의를 완료하면 다음 행동을 안내합니다.</p>
      <ReviewFlow issues={state.reviewIssues.length} consent={state.consent} authenticated={meta.authenticated} />
      <ReviewIssues disabled={submitting} />

      <section aria-labelledby="review-content-title" className="mt-9">
        <div className="flex items-end gap-4"><div><p className="text-sm font-semibold text-brand">1. 내용 확인과 오류 수정</p><h2 id="review-content-title" className="mt-1 text-xl font-bold">제출할 내용</h2></div><span className="ml-auto text-sm text-muted">각 영역에서 바로 수정할 수 있어요.</span></div>
        <div className="mt-4 border-y border-border bg-card md:rounded-card md:border md:px-5">
          <ReviewSection title="지원 배역"><p className="text-sm font-semibold text-brand">{meta.roleName}</p></ReviewSection>
          {REVIEW_SECTIONS.map((section) => <StepReview key={section} section={section} disabled={submitting} />)}
        </div>
      </section>

      <ProfileSave checked={state.saveToProfile} disabled={submitting} available={!isBackendAuditionId(meta.postingId)} onChange={actions.updateSaveToProfile} />
      <Consent consent={state.consent} privacyConsent={state.privacyConsent} thirdPartyConsent={state.thirdPartyConsent} disabled={submitting} error={state.submissionError.includes("동의") ? state.submissionError : ""} onAllChange={actions.updateConsent} onPrivacyChange={actions.updatePrivacyConsent} onThirdPartyChange={actions.updateThirdPartyConsent} />
      {!meta.authenticated ? <AuthGate /> : <SubmissionArea submitting={submitting} consent={state.consent} issueCount={state.reviewIssues.length} state={state.submissionState} error={state.submissionError} onSubmit={actions.submit} />}
    </div>
  </main>;
}

function ReviewFlow({ issues, consent, authenticated }: { issues: number; consent: boolean; authenticated: boolean }) {
  const submissionDetail = issues ? "오류 수정 후" : authenticated ? "제출 가능" : "인증 후";
  const items = [
    { label: "내용 확인", detail: issues ? `오류 ${issues}개` : "확인 완료", tone: issues ? "text-fail" : "text-pass" },
    { label: "필수 동의", detail: consent ? "동의 완료" : "확인 필요", tone: consent ? "text-pass" : "text-muted" },
    { label: "배우 인증", detail: authenticated ? "인증 완료" : "인증 필요", tone: authenticated ? "text-pass" : "text-muted" },
    { label: "최종 제출", detail: submissionDetail, tone: issues ? "text-warn" : authenticated ? "text-brand" : "text-muted" },
  ];
  return <nav aria-label="지원서 제출 순서" className="mt-7"><ol className="grid grid-cols-2 rounded-card border border-border bg-card md:grid-cols-4">{items.map((item, index) => <li key={item.label} className="flex min-h-20 items-center gap-3 border-b border-border-soft px-4 odd:border-r [&:nth-child(n+3)]:border-b-0 md:border-b-0 md:border-r md:last:border-r-0"><span aria-hidden="true" className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface text-sm font-bold text-muted-strong">{index + 1}</span><span><strong className="block text-sm">{item.label}</strong><span className={`mt-0.5 block text-xs font-semibold ${item.tone}`}>{item.detail}</span></span></li>)}</ol></nav>;
}

function ReviewIssues({ disabled }: { disabled: boolean }) {
  const { state, actions } = usePublicApplication();
  const summaryRef = useRef<HTMLElement>(null);
  useEffect(() => { if (state.reviewIssues.length) summaryRef.current?.focus(); }, [state.reviewIssues.length]);
  if (!state.reviewIssues.length) return null;
  return <section ref={summaryRef} tabIndex={-1} aria-labelledby="review-issues-title" className="mt-6 scroll-mt-24 rounded-card border border-fail/30 bg-fail-bg p-4 outline-none focus-visible:ring-2 focus-visible:ring-fail focus-visible:ring-offset-2 md:p-5">
    <h2 id="review-issues-title" className="text-base font-bold text-fail">수정할 항목이 {state.reviewIssues.length}개 있어요</h2>
    <p className="mt-1 text-sm leading-6 text-fail">오류를 선택하면 해당 입력 항목으로 이동합니다.</p>
    <ul className="mt-3 divide-y divide-fail/10">{state.reviewIssues.map((issue) => <li key={`${issue.section}-${issue.fieldId}`}><button type="button" disabled={disabled} onClick={() => actions.editSection(issue.section, issue.fieldId)} className="flex min-h-12 w-full items-center gap-3 rounded-control px-2 text-left text-sm text-fail hover:bg-card focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fail disabled:cursor-not-allowed"><span aria-hidden="true" className="font-bold">!</span><span className="min-w-0 flex-1"><strong>{issue.title}</strong><span className="block text-xs leading-5">{issue.message}</span></span><span className="shrink-0 font-semibold">수정 →</span></button></li>)}</ul>
  </section>;
}

function StepReview({ section, disabled }: { section: EditableSection; disabled: boolean }) {
  const { state, actions, meta } = usePublicApplication();
  const step = meta.steps.find((item) => item.sections.includes(section));
  if (!step) return null;
  const fields = step.fields.filter((field) => field.section === section);
  if (fields.length === 0) return null;
  const edit = () => actions.editSection(section);
  if (section === "MATERIALS") return <ReviewSection title={REVIEW_SECTION_TITLES[section]} disabled={disabled} onEdit={edit}><MediaSummary fields={fields} values={state.values} photos={state.photos} videoUrl={state.videoUrl} /></ReviewSection>;
  const careerField = fields.find((field) => field.id === "CAREER");
  const regularFields = fields.filter((field) => field.id !== "CAREER");
  return <ReviewSection title={REVIEW_SECTION_TITLES[section]} disabled={disabled} onEdit={edit}>{regularFields.length ? <ReviewFields fields={regularFields} values={state.values} /> : null}{careerField ? <div className={regularFields.length ? "mt-5 border-t border-border-soft pt-5" : ""}><h4 className="mb-2 text-sm text-muted">{careerField.label}</h4><CareerSummary noCareer={state.noCareer} careers={state.careers} /></div> : null}</ReviewSection>;
}

function ReviewSection({ title, disabled = false, onEdit, children }: { title: string; disabled?: boolean; onEdit?: () => void; children: React.ReactNode }) {
  return <section className="border-b border-border-soft py-5 last:border-b-0"><div className="flex items-center gap-3"><h3 className="text-base font-bold">{title}</h3>{onEdit ? <TextButton disabled={disabled} onClick={onEdit} className="ml-auto px-3 text-brand hover:bg-brand-soft disabled:hover:bg-transparent">수정</TextButton> : null}</div><div className="mt-3">{children}</div></section>;
}

function ProfileSave({ checked, disabled, available, onChange }: { checked: boolean; disabled: boolean; available: boolean; onChange: (checked: boolean) => void }) {
  if (!available) return <aside className="mt-8 border-y border-border-soft bg-surface py-5 md:px-1"><p className="text-xs font-semibold text-muted">선택 사항 · 후속 연동 예정</p><strong className="mt-2 block text-sm">이번 지원서 정보의 프로필 저장은 준비 중입니다</strong><span className="mt-1 block text-sm leading-6 text-muted">지원서 제출에는 포함되지 않으며, 현재는 프로필에서 정보를 직접 관리해 주세요.</span></aside>;
  return <aside aria-labelledby="profile-save-title" className="mt-8 border-y border-border-soft bg-surface py-5 md:px-1"><p className="text-xs font-semibold text-muted">선택 사항 · 제출 동의와 별개예요</p><label className="mt-2 flex cursor-pointer items-start gap-3"><input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-brand" /><span><strong id="profile-save-title" className="block text-sm">이번 지원서의 기본 정보를 프로필에도 저장</strong><span className="mt-1 block text-sm leading-6 text-muted">선택한 경우에만 기본·추가 정보와 사진을 다음 지원에 재사용합니다. 공고별 추가 질문 답변은 저장하지 않습니다.</span></span></label></aside>;
}

function Consent({ consent, privacyConsent, thirdPartyConsent, disabled, error, onAllChange, onPrivacyChange, onThirdPartyChange }: { consent: boolean; privacyConsent: boolean; thirdPartyConsent: boolean; disabled: boolean; error: string; onAllChange: (consent: boolean) => void; onPrivacyChange: (consent: boolean) => void; onThirdPartyChange: (consent: boolean) => void }) {
  const helpId = "application-consent-help";
  const errorId = "application-consent-error";
  const inputClass = "mt-1 h-5 w-5 shrink-0 accent-brand";
  return <section aria-labelledby="consent-title" className="mt-9"><p className="text-sm font-semibold text-brand">2. 필수 동의</p><h2 id="consent-title" className="mt-1 text-xl font-bold">제출 전 개인정보 안내를 확인해 주세요</h2><label htmlFor="application-consent" className={`mt-4 flex items-start gap-3 border-y border-border bg-card py-5 md:px-5 ${disabled ? "cursor-not-allowed text-muted" : "cursor-pointer"}`}><input id="application-consent" type="checkbox" checked={consent} disabled={disabled} aria-invalid={Boolean(error) || undefined} aria-describedby={[helpId, error ? errorId : ""].filter(Boolean).join(" ")} onChange={(event) => onAllChange(event.target.checked)} className={inputClass} /><span><strong className="block text-sm">필수 항목 모두 동의</strong><span id={helpId} className="mt-1 block text-sm leading-6 text-muted">아래 두 항목을 함께 선택하거나 각각 확인할 수 있습니다.</span></span></label><div className="divide-y divide-border-soft border-b border-border bg-card md:px-5"><ConsentItem id="application-privacy-consent" checked={privacyConsent} disabled={disabled} label="개인정보 수집·이용 동의" description="지원서 접수와 심사를 위해 입력한 개인정보를 수집·이용합니다." onChange={onPrivacyChange} /><ConsentItem id="application-third-party-consent" checked={thirdPartyConsent} disabled={disabled} label="개인정보 제3자 제공 동의" description="지원한 공고의 기획사/제작사가 심사를 위해 지원 정보를 열람합니다." onChange={onThirdPartyChange} /></div>{error ? <p id={errorId} role="alert" className="mt-3 text-sm font-medium leading-6 text-fail">{error}</p> : null}</section>;
}

function ConsentItem({ id, checked, disabled, label, description, onChange }: { id: string; checked: boolean; disabled: boolean; label: string; description: string; onChange: (checked: boolean) => void }) {
  return <label htmlFor={id} className={`flex items-start gap-3 py-4 ${disabled ? "cursor-not-allowed text-muted" : "cursor-pointer"}`}><input id={id} type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-brand" /><span><strong className="block text-sm"><span className="mr-1 text-fail">[필수]</span>{label}</strong><span className="mt-1 block text-sm leading-6 text-muted">{description}</span></span></label>;
}

function AuthGate() {
  const { state, meta } = usePublicApplication();
  const returnTo = encodeURIComponent(buildApplicationAuthReturnTo(meta.postingId, meta.roleIds));
  const blocked = state.hasUnsavedChanges;
  const blockNavigation = (event: React.MouseEvent<HTMLAnchorElement>) => { if (blocked) event.preventDefault(); };
  return <section aria-labelledby="auth-gate-title" className="mt-9 rounded-card border border-brand-line bg-brand-soft p-5 md:p-6"><p className="text-sm font-semibold text-brand">3. 배우 인증</p><h2 id="auth-gate-title" className="mt-1 text-xl font-bold">소셜 로그인하고 제출을 이어가세요</h2><p className="mt-2 text-sm font-medium leading-6 text-muted-strong">로그인해도 지금까지 작성한 지원 내용은 삭제되지 않습니다.</p>{blocked ? <p role="status" className="mt-3 text-sm font-medium text-warn">작성 내용 저장이 끝난 뒤 이동할 수 있어요.</p> : null}<div id="application-auth-actions" tabIndex={-1} className="mt-5"><Link href={`/login?returnTo=${returnTo}`} aria-disabled={blocked} onClick={blockNavigation} className={`inline-flex min-h-12 w-full items-center justify-center rounded-control border px-5 text-base font-semibold ${blocked ? "cursor-not-allowed border-border bg-border text-muted" : "border-brand bg-brand text-white shadow-[var(--shadow-1)] hover:bg-brand-strong"}`}>소셜 로그인하고 제출 계속</Link><p className="mt-3 text-center text-sm text-muted-strong">처음 이용해도 로그인과 함께 배우 계정이 자동으로 만들어집니다.</p></div></section>;
}

function SubmissionArea({ submitting, consent, issueCount, state, error, onSubmit }: { submitting: boolean; consent: boolean; issueCount: number; state: SubmissionState; error: string; onSubmit: (result: "SUCCESS" | "ERROR") => void }) {
  const showFailureControl = process.env.NODE_ENV === "development";
  const submissionError = error && !error.includes("동의") ? error : "";
  const blockedByIssues = issueCount > 0;
  const label = submitting ? "제출 중…" : blockedByIssues ? "오류를 수정해 주세요" : state === "ERROR" ? "다시 제출" : consent ? "지원서 제출" : "동의하고 제출";
  const status = submissionError ? `${submissionError} 입력값은 유지됩니다. 다시 제출해 주세요.` : submitting ? "작성 내용을 제출하고 있어요. 완료될 때까지 잠시만 기다려 주세요." : blockedByIssues ? `수정할 항목 ${issueCount}개를 해결하면 제출할 수 있어요.` : "제출이 완료되면 계정의 내 지원서에 읽기 전용 스냅샷으로 보관됩니다.";
  return <section aria-labelledby="submission-title" className="mt-9 rounded-card border border-brand-line bg-card p-5 md:p-6"><p className="text-sm font-semibold text-brand">4. 최종 제출</p><h2 id="submission-title" className="mt-1 text-xl font-bold">{blockedByIssues ? "오류를 수정하면 제출할 수 있어요" : "지원서를 제출할 준비가 됐어요"}</h2><div aria-live="polite" className="mt-3 flex min-h-[76px] items-start"><p role={submissionError ? "alert" : "status"} className={`w-full rounded-control border px-4 py-3 text-sm leading-6 ${submissionError ? "border-fail/20 bg-fail-bg font-medium text-fail" : submitting ? "border-brand-line bg-brand-soft font-medium text-brand" : blockedByIssues ? "border-warn/20 bg-warn-bg font-medium text-warn" : "border-border-soft bg-surface text-muted"}`}>{status}</p></div><PrimaryButton disabled={submitting || blockedByIssues} onClick={() => onSubmit("SUCCESS")} className="mt-3 min-h-12 w-full px-5 text-base">{label}</PrimaryButton>{showFailureControl ? <details className="mt-4 text-xs text-muted"><summary className="cursor-pointer px-2 py-1 font-medium hover:text-muted-strong">개발용 상태 확인</summary><TextButton disabled={submitting || blockedByIssues} onClick={() => onSubmit("ERROR")} className="mt-2 px-3 text-xs text-muted hover:bg-fail-bg hover:text-fail">실패 흐름 보기</TextButton></details> : null}</section>;
}

function ReviewFields({ fields, values }: { fields: readonly ApplicationFieldInput[]; values: Readonly<Record<string, string>> }) { return <dl className="grid gap-x-8 gap-y-3 text-sm md:grid-cols-2">{fields.filter((field) => field.enabled).map((field) => { const value = reviewValue(field, values); const href = field.inputType === "URL" && typeof value === "string" ? externalHttpHref(value) : null; return <div key={field.id} className="grid grid-cols-[112px_minmax(0,1fr)] gap-4"><dt className="whitespace-nowrap text-muted">{field.label}</dt><dd className="line-clamp-3 break-words whitespace-pre-wrap font-medium">{href ? <a href={href} target="_blank" rel="noopener noreferrer" className="text-brand underline decoration-brand-line underline-offset-2 hover:decoration-brand">{value}<span className="sr-only"> 새 창에서 열기</span></a> : value || <span className="font-normal text-muted">미입력</span>}</dd></div>; })}</dl>; }
function reviewValue(field: ApplicationFieldInput, values: Readonly<Record<string, string>>) { if (field.inputType === "COMPOSITE") return field.config.fields?.map((part) => `${values[`${field.id}.${part.key}`] || "-"}${part.unit ?? ""}`).join(" · "); return values[field.id]; }
function MediaSummary({ fields, values, photos, videoUrl }: { fields: readonly ApplicationFieldInput[]; values: Readonly<Record<string, string>>; photos: readonly ApplicationPhoto[]; videoUrl: string }) {
  const [expandedPhoto, setExpandedPhoto] = useState<number | null>(null);
  const lightboxTitleId = useId();
  const attached = orderedApplicationPhotos(photos).filter((photo) => photo.status !== "ERROR");
  const failedCount = photos.length - attached.length;
  const photoField = fields.find((field) => field.inputType === "FILE");
  const photoLabels = photoSlotLabels(photoField, attached.length);
  const videoField = fields.find((field) => field.section === "MATERIALS" && field.inputType === "URL");
  const requirements = videoField?.config.videoRequirements ?? [];
  const videos = requirements
    .flatMap((requirement) => {
      const id = youtubeVideoId(values[`${videoField?.id}.${requirement.id}`] ?? "");
      return id ? [{ label: requirement.description, id }] : [];
    });
  const legacyVideoId = youtubeVideoId(videoUrl);

  return <div className="space-y-4">
    {attached.length ? <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">{attached.map((photo, index) => <li key={photo.id} className="min-w-0"><button type="button" onClick={() => setExpandedPhoto(index)} className="group block w-full rounded-control text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"><span className="relative block aspect-[3/4] overflow-hidden rounded-control border border-border bg-surface transition-colors group-hover:border-brand-line"><Image src={photo.url} alt={photoLabels[index] ?? photo.name} fill unoptimized sizes="(min-width: 768px) 150px, 42vw" className="object-cover" /></span><strong className="mt-2 block truncate text-xs group-hover:text-brand">{photoLabels[index]}</strong><span className="sr-only"> 크게 보기</span></button></li>)}</ul> : <p className="text-sm text-muted">사진 미첨부</p>}
    {failedCount ? <p className="text-sm text-fail">첨부에 실패한 사진 {failedCount}개가 있어요.</p> : null}
    {videos.length ? <ul className="space-y-1 text-sm text-muted-strong">{videos.map((video) => <li key={video.label}><strong className="text-foreground">{video.label}</strong> · <a href={`https://youtu.be/${video.id}`} target="_blank" rel="noopener noreferrer" className="text-brand underline decoration-brand-line underline-offset-2 hover:decoration-brand">youtu.be/{video.id}<span className="sr-only"> 새 창에서 열기</span></a></li>)}</ul> : <p className="text-sm text-muted-strong">{legacyVideoId ? <>연결한 영상 · <a href={`https://youtu.be/${legacyVideoId}`} target="_blank" rel="noopener noreferrer" className="text-brand underline decoration-brand-line underline-offset-2 hover:decoration-brand">youtu.be/{legacyVideoId}<span className="sr-only"> 새 창에서 열기</span></a></> : "영상 미첨부"}</p>}
    {expandedPhoto !== null ? <ModalShell open onClose={() => setExpandedPhoto(null)} labelledBy={lightboxTitleId} className="flex h-[min(92dvh,860px)] w-[min(94vw,980px)] flex-col overflow-hidden rounded-modal bg-card shadow-[var(--shadow-modal)]"><header className="flex min-h-16 items-center gap-3 border-b border-border px-4 md:px-6"><div className="min-w-0 flex-1"><h2 id={lightboxTitleId} className="truncate font-bold">{photoLabels[expandedPhoto] ?? attached[expandedPhoto]?.name}</h2><p className="num mt-0.5 text-xs text-muted">{expandedPhoto + 1} / {attached.length}</p></div><TextButton onClick={() => setExpandedPhoto(null)} className="px-3">닫기</TextButton></header><div className="relative min-h-0 flex-1 bg-foreground"><Image src={attached[expandedPhoto]!.url} alt={photoLabels[expandedPhoto] ?? attached[expandedPhoto]!.name} fill unoptimized sizes="94vw" className="object-contain" />{expandedPhoto > 0 ? <button type="button" aria-label="이전 사진" onClick={() => setExpandedPhoto(expandedPhoto - 1)} className="absolute left-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-card/90 text-xl shadow-[var(--shadow-1)]">‹</button> : null}{expandedPhoto < attached.length - 1 ? <button type="button" aria-label="다음 사진" onClick={() => setExpandedPhoto(expandedPhoto + 1)} className="absolute right-3 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full bg-card/90 text-xl shadow-[var(--shadow-1)]">›</button> : null}</div></ModalShell> : null}
  </div>;
}
function externalHttpHref(value: string) { const trimmed = value.trim(); if (!trimmed) return null; try { const url = new URL(/^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`); return url.protocol === "http:" || url.protocol === "https:" ? url.href : null; } catch { return null; } }
function CareerSummary({ noCareer, careers }: { noCareer: boolean; careers: readonly CareerDraft[] }) { if (noCareer) return <p className="text-sm text-muted">경력 없음 (신인)</p>; if (!careers.length) return <p className="text-sm text-muted">경력 미입력</p>; return <ul className="divide-y divide-border-soft">{careers.map((career) => <li key={career.id} className="grid grid-cols-[56px_minmax(0,1fr)_auto] gap-3 py-3 text-sm"><span className="num text-muted">{career.year}</span><span className="min-w-0 break-words font-medium">{career.title}</span><span className="text-muted">{career.part}</span></li>)}</ul>; }

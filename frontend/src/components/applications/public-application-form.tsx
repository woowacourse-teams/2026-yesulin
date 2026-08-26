"use client";

import { useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import type { ApplicationWriteRouteKey } from "@/features/applications/application-form";
import { formatPhoneNumber } from "@/features/applications/phone-number";
import { PublicApplicationCareer } from "./public-application-career";
import { PublicApplicationExitDialog } from "./public-application-exit-dialog";
import { PublicApplicationMedia } from "./public-application-media";
import { PublicApplicationProvider, usePublicApplication } from "./public-application-context";
import { PublicSubmissionReceipt } from "./public-submission-receipt";
import { PublicApplicationReview } from "./public-application-review";
import { PublicApplicationSaveBadge, PublicApplicationSaveNotice } from "./public-application-save-status";
import type { PostingId } from "@/features/auditions/types";
import type { ProfilePrefillResponse } from "@/features/applicants/types";
import { CalendarDateRangeField } from "@/components/auditions/calendar-date-range-field";
import { RegionSelect } from "@/components/ui/region-select";
import { fieldControlClass, PrimaryButton, SecondaryButton, TextButton, UnitSuffix } from "@/components/ui/controls";

type PublicApplicationFormProps = {
  readonly postingId: PostingId;
  readonly fields: readonly ApplicationFieldInput[];
  readonly performanceTitle: string;
  readonly postingTitle: string;
  readonly roleIds: readonly string[];
  readonly roleName: string;
  readonly authenticated: boolean;
  readonly onBack: () => void;
  readonly prefill?: ProfilePrefillResponse;
  readonly initialRoute: ApplicationWriteRouteKey;
};

export function PublicApplicationForm(props: PublicApplicationFormProps) {
  return <PublicApplicationProvider {...props}><PublicApplicationContent /><PublicApplicationExitDialog /></PublicApplicationProvider>;
}

function PublicApplicationContent() {
  const { state, meta } = usePublicApplication();
  if (state.draftSaveStatus === "RESTORING") return <DraftRestoring />;
  if (meta.steps.length === 0) return <FormEmpty />;
  if (state.receipt) return <PublicSubmissionReceipt />;
  if (state.reviewing) return <PublicApplicationReview />;
  return <ApplicationStepScreen />;
}

function ApplicationStepScreen() {
  const { state, actions, meta } = usePublicApplication();
  const step = meta.steps[state.stepIndex]!;
  const isLastStep = state.stepIndex === meta.steps.length - 1;
  const nextLabel = isLastStep ? "검토하기" : "다음 단계";
  return <main className="min-h-screen bg-surface pb-[calc(148px+env(safe-area-inset-bottom))] text-foreground md:pb-12">
    <header className="glass-surface sticky top-0 z-20 border-x-0 border-t-0">
      <div className="mx-auto flex min-h-16 max-w-[880px] items-center px-5 md:px-8">
        <TextButton onClick={actions.requestBack} className="px-2">← 공고로 돌아가기</TextButton>
        <span className="ml-auto hidden text-sm font-semibold text-brand sm:inline">지원서 작성</span>
        <PublicApplicationSaveBadge />
      </div>
    </header>
    <div className="mx-auto max-w-[880px] px-5 py-7 md:px-8 md:py-12">
      <ApplicationStepper />
      <PublicApplicationSaveNotice />
      <PrefillNotice />
      <section aria-labelledby="application-step-title" className="border-y border-border bg-card py-7 md:rounded-modal md:border md:px-8 md:py-9">
        <ApplicationSectionHeader current={state.stepIndex + 1} total={meta.steps.length} title={step.title} description={step.description} />
        <div id="application-step-content"><StepContent /></div>
        <div className="mt-10 hidden items-center justify-between gap-3 md:flex">
          {state.stepIndex > 0 ? <PreviousButton /> : <span />}
          <NextButton label={nextLabel} />
        </div>
      </section>
    </div>
    <ApplicantStickyAction label={nextLabel} />
  </main>;
}

function PrefillNotice() {
  const { meta } = usePublicApplication();
  if (!meta.prefillSummary || meta.prefillSummary.filledCount === 0) return null;
  return <div role="status" className="mb-6 rounded-card border border-brand-line bg-brand-soft px-4 py-3 text-sm leading-6 text-muted-strong"><strong className="text-brand">프로필에서 필수 항목 {meta.prefillSummary.filledCount} / {meta.prefillSummary.requiredCount}개를 채웠어요.</strong>{meta.prefillSummary.missingKeys.length ? " 남은 항목만 확인해 주세요." : " 모든 필수 항목이 준비됐습니다."}</div>;
}

function ApplicationSectionHeader({ current, total, title, description }: { current: number; total: number; title: string; description: string }) {
  return <div><p className="num text-sm font-semibold text-brand">{current} / {total}</p><h1 id="application-step-title" className="mt-2 text-2xl font-bold tracking-[-0.025em] md:text-[28px]">{title}</h1><p className="mt-3 max-w-[640px] leading-6 text-muted-strong">{description}</p></div>;
}

function ApplicationStepper() {
  const { state, meta } = usePublicApplication();
  const current = meta.steps[state.stepIndex]!;
  return <nav aria-label="지원서 단계" className="mb-8 md:mb-10"><p className="mb-3 text-sm text-muted-strong md:hidden"><span className="font-semibold text-foreground">현재 단계 {state.stepIndex + 1} / {meta.steps.length}</span><span aria-hidden="true"> · </span>{current.title}</p><ol className="scrollbar-hidden flex gap-2 overflow-x-auto pb-2">{meta.steps.map((step, index) => <StepButton key={step.key} index={index} title={step.title} />)}</ol></nav>;
}

function StepButton({ index, title }: { index: number; title: string }) {
  const { state, actions } = usePublicApplication();
  const progress = state.stepProgress[index]!;
  const label = progress.hasError ? "오류 있음" : progress.status === "COMPLETED" ? "완료" : progress.status === "CURRENT" ? "작성 중" : "아직 작성할 수 없음";
  const tone = progress.status === "CURRENT" ? "border-brand bg-brand text-white" : progress.hasError ? "border-fail/30 bg-fail-bg text-fail" : progress.status === "COMPLETED" ? "border-brand-line bg-brand-soft text-brand" : "border-border bg-card text-muted";
  return <li><button type="button" disabled={!progress.accessible} aria-current={progress.status === "CURRENT" ? "step" : undefined} aria-label={`${index + 1}. ${title}, ${label}`} onClick={() => actions.moveStep(index)} className={`inline-flex min-h-11 shrink-0 items-center gap-2 whitespace-nowrap rounded-control border px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:border-border disabled:bg-border-soft disabled:text-muted ${tone}`}><span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded-full border border-current text-xs">{progress.hasError ? "!" : progress.status === "COMPLETED" ? "✓" : index + 1}</span><span>{title}</span><span className="sr-only">, {label}</span></button></li>;
}

function StepContent() {
  const { state, meta } = usePublicApplication();
  const step = meta.steps[state.stepIndex]!;
  if (step.key === "media") return <div className="mt-9"><PublicApplicationMedia /></div>;
  if (step.fields.length === 0) return <p className="mt-9 rounded-card border border-dashed border-border bg-surface px-5 py-10 text-center text-sm text-muted-strong">공고에서 요청한 추가 질문이 없습니다.</p>;
  return <div className="mt-9 grid grid-cols-1 gap-x-6 gap-y-8 md:grid-cols-2">{step.fields.map((field) => field.id === "CAREER" ? <div key={field.id} className="md:col-span-2"><PublicApplicationCareer field={field} /></div> : <ApplicationField key={field.id} field={field} />)}</div>;
}

function ApplicationField({ field }: { field: ApplicationFieldInput }) {
  const { state, actions } = usePublicApplication();
  const id = `application-${field.id}`;
  const error = state.stepError.startsWith(field.label) ? state.stepError : "";
  const errorId = `${id}-error`;
  const width = field.layout === "FULL" || field.inputType === "TEXTAREA" ? "md:col-span-2" : "";
  const describedBy = error ? errorId : undefined;
  if (field.inputType === "DATE") return <fieldset id={`application-field-${field.id}`} className={width}><legend className="mb-2 flex items-center gap-1 text-sm font-semibold text-foreground"><FieldLabelText field={field} /></legend><div aria-invalid={Boolean(error) || undefined} aria-describedby={describedBy}><CalendarDateRangeField single variant="compact" start={state.values[field.id] ?? ""} end="" startLabel={field.label} onStartChange={(value) => actions.updateField(field.id, value)} onEndChange={() => undefined} /></div>{error ? <InlineError id={errorId} error={error} /> : null}</fieldset>;
  if (field.inputType === "COMPOSITE" || field.inputType === "REGION") return <fieldset id={`application-field-${field.id}`} className={width}><legend className="mb-2 flex items-center gap-1 text-sm font-semibold text-foreground"><FieldLabelText field={field} /></legend><FieldControl field={field} id={id} error={error} describedBy={describedBy} />{error ? <InlineError id={errorId} error={error} /> : null}</fieldset>;
  return <div id={`application-field-${field.id}`} className={width}><label htmlFor={id} className="mb-2 flex items-center gap-1 text-sm font-semibold text-foreground"><FieldLabelText field={field} /></label><FieldControl field={field} id={id} error={error} describedBy={describedBy} />{error ? <InlineError id={errorId} error={error} /> : null}</div>;
}

function FieldLabelText({ field }: { field: ApplicationFieldInput }) { return <>{field.label}{field.required ? <span className="text-fail" aria-label="필수">*</span> : <span className="text-muted">(선택)</span>}</>; }
function InlineError({ id, error }: { id: string; error: string }) { return <p id={id} role="alert" className="mt-2 text-sm font-medium leading-6 text-fail">{error}</p>; }

function FieldControl({ field, id, error, describedBy }: { field: ApplicationFieldInput; id: string; error: string; describedBy?: string }) {
  const { state, actions } = usePublicApplication();
  const value = state.values[field.id] ?? "";
  const className = `${fieldControlClass} ${error ? "border-fail focus:border-fail focus:ring-fail-bg" : ""}`;
  const formatValue = (next: string) => field.inputType === "TEL" ? formatPhoneNumber(next) : next;
  const common = { id, name: field.id, required: field.required, value, placeholder: field.config.placeholder, maxLength: field.inputType === "TEL" ? 13 : field.config.maxLength, "aria-invalid": Boolean(error) || undefined, "aria-describedby": describedBy, onChange: (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => actions.updateField(field.id, formatValue(event.target.value)), className };
  if (field.inputType === "TEXTAREA") return <textarea {...common} minLength={field.config.minLength} rows={6} className={`${className} resize-none`} />;
  if (field.inputType === "SELECT") return <select {...common}><option value="">선택해 주세요</option>{field.config.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
  if (field.inputType === "COMPOSITE") return <div className="grid grid-cols-2 gap-3">{field.config.fields?.map((part) => { const partId = `${field.id}.${part.key}`; const inputId = `${id}-${part.key}`; const isPhone = part.inputType === "TEL"; return <label key={part.key} htmlFor={inputId} className="relative"><span className="mb-2 block text-sm font-medium text-foreground">{part.label}</span><input id={inputId} name={partId} required={field.required} type={part.inputType === "NUMBER" ? "number" : isPhone ? "tel" : "text"} value={state.values[partId] ?? ""} placeholder={part.placeholder} maxLength={isPhone ? 13 : undefined} aria-invalid={Boolean(error) || undefined} aria-describedby={describedBy} onChange={(event) => actions.updateField(partId, isPhone ? formatPhoneNumber(event.target.value) : event.target.value)} className={`${className} pr-10`} />{part.unit ? <span className="pointer-events-none absolute right-3 top-10 text-sm text-muted">{part.unit}</span> : null}</label>; })}</div>;
  if (field.inputType === "REGION") return <RegionSelect id={id} value={value} required={field.required} invalid={Boolean(error)} describedBy={describedBy} onChange={(next) => actions.updateField(field.id, next)} />;
  const type = field.inputType === "TEL" ? "tel" : field.inputType === "NUMBER" ? "number" : field.inputType === "URL" ? "url" : "text";
  const number = field.inputType === "NUMBER";
  const input = <input {...common} type={type} inputMode={field.inputType === "TEL" ? "tel" : number ? "numeric" : undefined} min={number ? 1 : undefined} step={number ? 1 : undefined} className={`${className}${field.config.unit ? " pr-12" : ""}`} />;
  if (!field.config.unit) return input;
  return <span className="relative block">{input}<UnitSuffix unit={field.config.unit} /></span>;
}

function PreviousButton() { const { state, actions } = usePublicApplication(); return <SecondaryButton onClick={() => actions.moveStep(state.stepIndex - 1)} className="px-5">이전</SecondaryButton>; }
function NextButton({ label }: { label: string }) { const { actions } = usePublicApplication(); return <PrimaryButton onClick={actions.nextStep} className="px-5">{label}</PrimaryButton>; }

function ApplicantStickyAction({ label }: { label: string }) {
  const { state } = usePublicApplication();
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const updateKeyboardState = () => setKeyboardOpen(window.innerHeight - viewport.height > 160);
    viewport.addEventListener("resize", updateKeyboardState);
    return () => viewport.removeEventListener("resize", updateKeyboardState);
  }, []);
  if (keyboardOpen) return null;
  return <div className="glass-surface fixed inset-x-0 bottom-0 z-20 border-x-0 border-b-0 md:hidden"><div className="mx-auto flex max-w-[880px] items-center gap-3 px-5 pb-[max(12px,env(safe-area-inset-bottom))] pt-3"><span className="min-w-0 flex-1 text-xs leading-5 text-muted-strong">{state.stepError ? "입력 내용을 확인해 주세요." : `현재 ${state.stepIndex + 1} / ${state.stepProgress.length} 단계`}</span>{state.stepIndex > 0 ? <PreviousButton /> : null}<NextButton label={label} /></div></div>;
}

function FormEmpty() {
  const { meta } = usePublicApplication();
  return <main className="min-h-screen bg-surface px-5 py-16 md:px-8"><section className="mx-auto max-w-[680px] rounded-modal border border-border bg-card px-6 py-14 text-center"><p className="text-sm font-semibold text-muted-strong">작성할 지원서 항목이 없어요</p><h1 className="mt-3 text-2xl font-bold">공고 설정을 확인해 주세요.</h1><PrimaryButton onClick={meta.onBack} className="mt-7 px-5">공고로 돌아가기</PrimaryButton></section></main>;
}

function DraftRestoring() {
  return <main className="grid min-h-screen place-items-center bg-surface px-5 text-foreground"><section role="status" className="w-full max-w-lg rounded-modal border border-border bg-card px-6 py-12 text-center"><span aria-hidden="true" className="mx-auto block h-10 w-10 animate-pulse rounded-2xl bg-brand" /><h1 className="mt-5 text-xl font-bold">이 기기의 작성 내용을 확인하고 있어요</h1><p className="mt-2 text-sm leading-6 text-muted-strong">저장된 입력값과 사진이 있으면 불러온 뒤 지원서를 열게요.</p></section></main>;
}

"use client";

import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import {
  PublicApplicationProvider,
  usePublicApplication,
} from "./public-application-context";
import { PublicApplicationCareer } from "./public-application-career";
import { PublicApplicationMedia } from "./public-application-media";
import { PublicApplicationReceipt } from "./public-application-receipt";
import { PublicApplicationReview } from "./public-application-review";

const controlClass = "min-h-12 w-full rounded-control border border-border bg-card px-3 py-2.5 text-base outline-none transition-[border-color,box-shadow] placeholder:text-muted-soft hover:border-muted-soft focus:border-brand focus:ring-2 focus:ring-brand-soft";

type PublicApplicationFormProps = {
  readonly fields: readonly ApplicationFieldInput[];
  readonly performanceTitle: string;
  readonly postingTitle: string;
  readonly roleName: string;
  readonly onBack: () => void;
};

export function PublicApplicationForm(props: PublicApplicationFormProps) {
  return <PublicApplicationProvider {...props}><PublicApplicationContent /></PublicApplicationProvider>;
}

function PublicApplicationContent() {
  const { state, meta } = usePublicApplication();
  if (meta.steps.length === 0) return <FormEmpty />;
  if (state.receipt) return <PublicApplicationReceipt />;
  if (state.reviewing) return <PublicApplicationReview />;
  return <ApplicationStepScreen />;
}

function ApplicationStepScreen() {
  const { state, actions, meta } = usePublicApplication();
  const step = meta.steps[state.stepIndex]!;
  return (
    <main className="min-h-screen bg-surface pb-10 text-foreground">
      <header className="glass-surface sticky top-0 z-20 border-x-0 border-t-0">
        <div className="mx-auto flex min-h-16 max-w-[880px] items-center px-5 sm:px-8">
          <button type="button" onClick={meta.onBack} className="inline-flex min-h-11 items-center rounded-control px-2 text-sm font-semibold text-muted-strong hover:bg-surface hover:text-foreground">← 공고로 돌아가기</button>
          <strong className="ml-auto text-sm text-brand">지원서 작성</strong>
        </div>
      </header>
      <div className="mx-auto max-w-[880px] px-5 py-8 sm:px-8 sm:py-12">
        <ol aria-label="지원서 단계" className="mb-9 flex gap-2 overflow-x-auto pb-1">
          {meta.steps.map((item, index) => <li key={item.section} aria-current={index === state.stepIndex ? "step" : undefined} className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-semibold ${index === state.stepIndex ? "bg-brand text-white" : "bg-card text-muted-strong"}`}>{index + 1}. {item.title}</li>)}
        </ol>
        <section className="rounded-modal border border-border bg-card p-5 sm:p-8">
          <p className="text-sm font-semibold text-brand">{state.stepIndex + 1} / {meta.steps.length}</p>
          <h1 className="mt-2 text-2xl font-bold tracking-[-0.025em]">{step.title}</h1>
          <p className="mt-2 text-muted-strong">{step.description}</p>
          <StepContent />
          <div className="mt-8 flex items-center justify-between gap-3">
            {state.stepIndex > 0 ? <button type="button" onClick={() => actions.moveStep(state.stepIndex - 1)} className="min-h-11 rounded-control border border-border px-5 text-sm font-semibold text-muted-strong hover:border-brand-line hover:bg-brand-soft hover:text-brand">이전</button> : <span />}
            <button type="button" onClick={actions.nextStep} className="min-h-11 rounded-control bg-brand px-5 text-sm font-semibold text-white transition-colors hover:bg-brand-strong">{state.stepIndex === meta.steps.length - 1 ? "검토하기" : "다음 단계"}</button>
          </div>
        </section>
      </div>
    </main>
  );
}

function StepContent() {
  const { state, meta } = usePublicApplication();
  const step = meta.steps[state.stepIndex]!;
  if (step.section === "MATERIALS") return <div className="mt-8"><PublicApplicationMedia /></div>;
  if (step.section === "CAREER") return <div className="mt-8"><PublicApplicationCareer /></div>;
  return (
    <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
      {step.fields.map((field) => <DynamicField key={field.id} field={field} />)}
    </div>
  );
}

function FormEmpty() {
  const { meta } = usePublicApplication();
  return <main className="min-h-screen bg-surface px-5 py-16 sm:px-8"><section className="mx-auto max-w-[680px] rounded-modal border border-border bg-card px-6 py-14 text-center"><p className="text-sm font-semibold text-muted-strong">작성할 지원서 항목이 없어요</p><h1 className="mt-3 text-2xl font-bold">공고 설정을 확인해 주세요.</h1><button type="button" onClick={meta.onBack} className="mt-7 min-h-11 rounded-control bg-brand px-5 font-semibold text-white hover:bg-brand-strong">공고로 돌아가기</button></section></main>;
}

function DynamicField({ field }: { field: ApplicationFieldInput }) {
  const { state } = usePublicApplication();
  const id = `application-${field.id}`;
  const width = field.layout === "FULL" ? "sm:col-span-2" : "";
  const error = state.stepError.startsWith(`${field.label} `) ? state.stepError : "";
  if (field.inputType === "COMPOSITE") {
    return <fieldset className={width} aria-describedby={error ? `${id}-error` : undefined}><legend className="mb-2 flex items-center gap-1 text-sm font-semibold text-foreground"><FieldLabelText field={field} /></legend><FieldControl field={field} id={id} error={error} />{error ? <FieldError id={`${id}-error`} error={error} /> : null}</fieldset>;
  }
  return <div className={width}><label htmlFor={id} className="mb-2 flex items-center gap-1 text-sm font-semibold text-foreground"><FieldLabelText field={field} /></label><FieldControl field={field} id={id} error={error} />{error ? <FieldError id={`${id}-error`} error={error} /> : null}</div>;
}

function FieldLabelText({ field }: { field: ApplicationFieldInput }) {
  return <>{field.label}{field.required ? <span className="text-fail" aria-label="필수">*</span> : <span className="text-muted">(선택)</span>}</>;
}

function FieldError({ id, error }: { id: string; error: string }) {
  return <p id={id} role="alert" className="mt-2 text-sm font-medium text-fail">{error}</p>;
}

function FieldControl({ field, id, error }: { field: ApplicationFieldInput; id: string; error: string }) {
  const { state, actions } = usePublicApplication();
  const value = state.values[field.id] ?? "";
  const common = { id, name: field.id, required: field.required, value, placeholder: field.config.placeholder, maxLength: field.config.maxLength, "aria-invalid": Boolean(error) || undefined, "aria-describedby": error ? `${id}-error` : undefined, onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => actions.updateField(field.id, event.target.value), className: controlClass };
  if (field.inputType === "TEXTAREA") return <textarea {...common} minLength={field.config.minLength} rows={5} className={`${controlClass} resize-y`} />;
  if (field.inputType === "SELECT") return <select {...common}><option value="">선택해 주세요</option>{field.config.options?.map((option) => <option key={option} value={option}>{option}</option>)}</select>;
  if (field.inputType === "COMPOSITE") return <div className="grid grid-cols-2 gap-3">{field.config.fields?.map((part) => { const partId = `${field.id}.${part.key}`; const inputId = `${id}-${part.key}`; return <label key={part.key} htmlFor={inputId} className="relative"><span className="sr-only">{part.label}</span><input id={inputId} name={partId} required={field.required} type={part.inputType === "NUMBER" ? "number" : part.inputType === "TEL" ? "tel" : "text"} value={state.values[partId] ?? ""} placeholder={part.placeholder} aria-invalid={Boolean(error) || undefined} aria-describedby={error ? `${id}-error` : undefined} onChange={(event) => actions.updateField(partId, event.target.value)} className={`${controlClass} pr-10`} />{part.unit ? <span className="pointer-events-none absolute right-3 top-3.5 text-sm text-muted">{part.unit}</span> : null}</label>; })}</div>;
  const type = field.inputType === "DATE" ? "date" : field.inputType === "TEL" ? "tel" : field.inputType === "NUMBER" ? "number" : field.inputType === "URL" ? "url" : "text";
  return <input {...common} type={type} inputMode={field.inputType === "TEL" ? "tel" : field.inputType === "NUMBER" ? "numeric" : undefined} />;
}

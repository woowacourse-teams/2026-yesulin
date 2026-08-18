"use client";

import type { ApplicantAnswerValue, BodyMeasurements, CareerEntry } from "@/features/applicants/types";
import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import { AddButton, FieldInput, FieldSelect, FieldTextarea, TextButton } from "@/components/ui/controls";

type InformationSectionProps = {
  readonly tab: "BASIC" | "ADDITIONAL";
  readonly fields: readonly ApplicationFieldInput[];
  readonly values: Readonly<Record<string, ApplicantAnswerValue>>;
  readonly onChange: (key: string, value: ApplicantAnswerValue) => void;
};

export function ProfileInformationSection({ tab, fields, values, onChange }: InformationSectionProps) {
  const visibleFields = fields.filter((field) => field.id !== "CAREER");
  return <div className="mt-6 space-y-7">
    <div className="grid gap-5 md:grid-cols-2">{visibleFields.map((field) => <StandardField key={field.id} field={field} value={values[field.id]} required={tab === "BASIC"} onChange={(value) => onChange(field.id, value)} />)}</div>
    {tab === "ADDITIONAL" ? <CareerSection value={careerValue(values.CAREER)} onChange={(value) => onChange("CAREER", value)} /> : null}
  </div>;
}

function StandardField({ field, value, required, onChange }: { readonly field: ApplicationFieldInput; readonly value?: ApplicantAnswerValue; readonly required: boolean; readonly onChange: (value: ApplicantAnswerValue) => void }) {
  const id = `profile-${field.id}`;
  const width = field.layout === "FULL" || field.inputType === "TEXTAREA" || field.inputType === "COMPOSITE" ? "md:col-span-2" : "";
  const label = <>{field.label}{required ? <span className="ml-1 text-fail" aria-label="필수">*</span> : <span className="ml-1 text-xs font-normal text-muted">(선택)</span>}</>;
  if (field.inputType === "COMPOSITE") {
    const body = isBody(value) ? value : { height: 0, weight: 0 };
    return <fieldset className={width}><legend className="mb-2 text-sm font-semibold">{label}</legend><div className="grid gap-3 sm:grid-cols-2">{field.config.fields?.map((part) => <label key={part.key} htmlFor={`${id}-${part.key}`}><span className="mb-2 block text-sm text-muted-strong">{part.label}</span><div className="relative"><FieldInput id={`${id}-${part.key}`} type="number" min="1" required={required} value={body[part.key as keyof BodyMeasurements] || ""} placeholder={part.placeholder} onChange={(event) => onChange({ ...body, [part.key]: Number(event.target.value) })} className="pr-12" /><span className="absolute right-3 top-3 text-sm text-muted">{part.unit}</span></div></label>)}</div></fieldset>;
  }
  const text = typeof value === "string" || typeof value === "number" ? String(value) : "";
  return <label htmlFor={id} className={width}><span className="mb-2 block text-sm font-semibold">{label}</span>{field.inputType === "TEXTAREA" ? <FieldTextarea id={id} required={required} rows={6} maxLength={field.config.maxLength} value={text} placeholder={field.config.placeholder} onChange={(event) => onChange(event.target.value)} /> : field.inputType === "SELECT" ? <FieldSelect id={id} required={required} value={text} onChange={(event) => onChange(event.target.value)}><option value="">선택하지 않음</option>{field.config.options?.map((option) => <option key={option}>{option}</option>)}</FieldSelect> : <FieldInput id={id} required={required} type={field.inputType === "DATE" ? "date" : field.inputType === "TEL" ? "tel" : field.inputType === "URL" ? "url" : "text"} value={text} placeholder={field.config.placeholder} onChange={(event) => onChange(event.target.value)} />}</label>;
}

function CareerSection({ value, onChange }: { readonly value: readonly CareerEntry[]; readonly onChange: (value: ApplicantAnswerValue) => void }) {
  const patch = (index: number, update: Partial<CareerEntry>) => onChange(value.map((career, candidate) => candidate === index ? { ...career, ...update } : career));
  return <section className="border-t border-border-soft pt-7"><div><h3 className="font-bold">경력 <span className="text-xs font-normal text-muted">(선택)</span></h3><p className="mt-1 text-sm leading-6 text-muted">최근 경력부터 정리하면 지원서에도 같은 순서로 채워집니다.</p></div><div className="mt-4 space-y-4">{value.map((career, index) => <article key={`${career.title}-${index}`} className="rounded-card border border-border bg-surface p-4"><div className="mb-3 flex items-center"><strong className="text-sm">경력 {index + 1}</strong><TextButton onClick={() => onChange(value.filter((_, candidate) => candidate !== index))} className="ml-auto px-3 text-fail hover:bg-fail-bg hover:text-fail">삭제</TextButton></div><div className="grid gap-3 sm:grid-cols-[100px_1fr_160px]"><label><span className="mb-1 block text-xs text-muted">연도</span><FieldInput type="number" value={career.year || ""} onChange={(event) => patch(index, { year: Number(event.target.value) })} /></label><label><span className="mb-1 block text-xs text-muted">작품명</span><FieldInput value={career.title} onChange={(event) => patch(index, { title: event.target.value })} /></label><label><span className="mb-1 block text-xs text-muted">배역</span><FieldInput value={career.part} onChange={(event) => patch(index, { part: event.target.value })} /></label></div></article>)}{value.length === 0 ? <div className="rounded-card border border-dashed border-border bg-surface px-5 py-8 text-center text-sm text-muted">저장한 경력이 없어요.</div> : null}{value.length < 10 ? <AddButton onClick={() => onChange([...value, { year: new Date().getFullYear(), title: "", part: "" }])} className="min-h-12 w-full">+ 경력 추가</AddButton> : <p className="text-sm text-muted">경력은 최대 10개까지 추가할 수 있어요.</p>}</div></section>;
}

function isBody(value: unknown): value is BodyMeasurements { return typeof value === "object" && value !== null && !Array.isArray(value) && "height" in value && "weight" in value; }
function isCareer(value: unknown): value is CareerEntry { return typeof value === "object" && value !== null && "year" in value && "title" in value && "part" in value; }
function careerValue(value: ApplicantAnswerValue | undefined) { return Array.isArray(value) ? value.filter(isCareer) : []; }

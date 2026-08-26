"use client";

import { useState } from "react";
import type { ApplicantAnswerValue, CareerEntry } from "@/features/applicants/types";
import { formatKoreanPhone, integerMeasurementError, isIntegerMeasurement, isValidEmail, isValidKoreanPhone } from "@/features/applicants/profile-input";
import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import { CalendarDateRangeField } from "@/components/auditions/calendar-date-range-field";
import { AddButton, DestructiveButton, FieldInput, FieldSelect, FieldTextarea, TextButton, UnitSuffix } from "@/components/ui/controls";
import { RegionSelect } from "@/components/ui/region-select";

const MAX_PROFILE_LINKS = 5;
const MAX_PROFILE_LINK_LENGTH = 255;

type InformationSectionProps = {
  readonly tab: "BASIC" | "ADDITIONAL";
  readonly fields: readonly ApplicationFieldInput[];
  readonly values: Readonly<Record<string, ApplicantAnswerValue>>;
  readonly onChange: (key: string, value: ApplicantAnswerValue) => void;
};

export function ProfileInformationSection({ tab, fields, values, onChange }: InformationSectionProps) {
  const visibleFields = fields.filter((field) => field.id !== "CAREER");
  return <div className="mt-6 space-y-7">
    <div className="grid gap-5 md:grid-cols-2">{visibleFields.map((field) => <StandardField key={field.id} field={field} value={values[field.id]} onChange={(value) => onChange(field.id, value)} />)}</div>
    {tab === "ADDITIONAL" ? <CareerSection value={careerValue(values.CAREER)} onChange={(value) => onChange("CAREER", value)} /> : null}
  </div>;
}

function StandardField({ field, value, onChange }: { readonly field: ApplicationFieldInput; readonly value?: ApplicantAnswerValue; readonly onChange: (value: ApplicantAnswerValue) => void }) {
  const [touched, setTouched] = useState(false);
  const id = `profile-${field.id}`;
  const width = field.layout === "FULL" || field.inputType === "TEXTAREA" || field.inputType === "COMPOSITE" ? "md:col-span-2" : "";
  const label = <>{field.label}<span className="ml-1 text-xs font-normal text-muted">(선택)</span></>;
  if (field.id === "LINK") return <ExternalLinksField value={linkValue(value)} onChange={onChange} />;
  const text = typeof value === "string" || typeof value === "number" ? String(value) : "";
  const contactError = touched && field.id === "PHONE" && text && !isValidKoreanPhone(text) ? "연락처를 확인해 주세요. 예: 010-1234-5678" : "";
  const emailError = touched && field.id === "EMAIL" && text && !isValidEmail(text) ? "이메일 주소 형식을 확인해 주세요. 예: actor@example.com" : "";
  const measurementError = touched && field.inputType === "NUMBER" && !isIntegerMeasurement(text) ? integerMeasurementError(field.label) : "";
  const fieldError = contactError || emailError || measurementError;
  if (field.inputType === "DATE") return <fieldset className={width}><legend className="mb-2 text-sm font-semibold">{label}</legend><CalendarDateRangeField single variant="compact" start={text} end="" startLabel={field.label} onStartChange={onChange} onEndChange={() => undefined} /></fieldset>;
  if (field.inputType === "REGION") return <fieldset className={width}><legend className="mb-2 text-sm font-semibold">{label}</legend><RegionSelect id={id} value={text} onChange={onChange} /></fieldset>;
  const control = <FieldInput id={id} type={field.id === "EMAIL" ? "email" : field.inputType === "TEL" ? "tel" : field.inputType === "URL" ? "url" : field.inputType === "NUMBER" ? "number" : "text"} inputMode={field.id === "PHONE" ? "tel" : field.id === "EMAIL" ? "email" : field.inputType === "NUMBER" ? "numeric" : undefined} autoComplete={field.id === "PHONE" ? "tel" : field.id === "EMAIL" ? "email" : undefined} min={field.inputType === "NUMBER" ? 1 : undefined} step={field.inputType === "NUMBER" ? 1 : undefined} maxLength={field.id === "PHONE" ? 13 : undefined} value={text} placeholder={field.config.placeholder} aria-invalid={Boolean(fieldError) || undefined} aria-describedby={fieldError ? `${id}-error` : undefined} className={field.config.unit ? "pr-12" : ""} onBlur={() => setTouched(true)} onChange={(event) => onChange(field.id === "PHONE" ? formatKoreanPhone(event.target.value) : field.inputType === "NUMBER" ? Number(event.target.value) : event.target.value)} />;
  const textInput = <>{field.config.unit ? <span className="relative block">{control}<UnitSuffix unit={field.config.unit} /></span> : control}{fieldError ? <span id={`${id}-error`} role="alert" className="mt-2 block text-sm font-medium text-fail">{fieldError}</span> : null}</>;
  return <label htmlFor={id} className={width}><span className="mb-2 block text-sm font-semibold">{label}</span>{field.inputType === "TEXTAREA" ? <><FieldTextarea id={id} rows={6} maxLength={field.config.maxLength} value={text} placeholder={field.config.placeholder} onChange={(event) => onChange(event.target.value)} />{field.config.maxLength ? <span className="num mt-2 block text-right text-xs text-muted">{text.length.toLocaleString("ko-KR")} / {field.config.maxLength.toLocaleString("ko-KR")}자</span> : null}</> : field.inputType === "SELECT" ? <FieldSelect id={id} value={text} onChange={(event) => onChange(event.target.value)}><option value="">선택하지 않음</option>{field.config.options?.map((option) => <option key={option}>{option}</option>)}</FieldSelect> : textInput}</label>;
}

function ExternalLinksField({ value, onChange }: { readonly value: readonly string[]; readonly onChange: (value: ApplicantAnswerValue) => void }) {
  const patch = (index: number, next: string) => onChange(value.map((link, candidate) => candidate === index ? next.slice(0, MAX_PROFILE_LINK_LENGTH) : link));
  return <section className="md:col-span-2"><div className="flex flex-wrap items-end justify-between gap-3"><div><h3 className="text-sm font-semibold">SNS / 외부 링크 <span className="text-xs font-normal text-muted">(선택)</span></h3><p className="mt-1 text-sm leading-6 text-muted">인스타그램, 개인 홈페이지, 포트폴리오처럼 배우 활동을 확인할 수 있는 주소를 등록하세요.</p></div><span className="num text-xs font-medium text-muted">{value.length} / {MAX_PROFILE_LINKS}</span></div><div className="mt-3 space-y-3">{value.map((link, index) => {
    const inputId = `profile-link-${index}`;
    const countId = `${inputId}-count`;
    return <div key={inputId} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-2">
      <label htmlFor={inputId} className="sr-only">SNS / 외부 링크 {index + 1}</label>
      <div className="min-w-0">
        <FieldInput id={inputId} type="url" inputMode="url" maxLength={MAX_PROFILE_LINK_LENGTH} value={link} placeholder="https://instagram.com/..." aria-describedby={countId} onChange={(event) => patch(index, event.target.value)} />
        <span id={countId} className="num mt-1 block text-right text-xs text-muted">{link.length} / {MAX_PROFILE_LINK_LENGTH}자</span>
      </div>
      <DestructiveButton onClick={() => onChange(value.filter((_, candidate) => candidate !== index))} aria-label={`SNS / 외부 링크 ${index + 1} 삭제`} className="px-3">삭제</DestructiveButton>
    </div>;
  })}{value.length === 0 ? <div className="rounded-control border border-dashed border-border bg-surface px-4 py-6 text-center text-sm text-muted">등록한 SNS / 외부 링크가 없어요.</div> : null}{value.length < MAX_PROFILE_LINKS ? <AddButton onClick={() => onChange([...value, ""])} className="min-h-12 w-full">+ 링크 추가</AddButton> : null}</div></section>;
}

function CareerSection({ value, onChange }: { readonly value: readonly CareerEntry[]; readonly onChange: (value: ApplicantAnswerValue) => void }) {
  const patch = (index: number, update: Partial<CareerEntry>) => onChange(value.map((career, candidate) => candidate === index ? { ...career, ...update } : career));
  return <section className="border-t border-border-soft pt-7"><div><h3 className="font-bold">경력 <span className="text-xs font-normal text-muted">(선택)</span></h3><p className="mt-1 text-sm leading-6 text-muted">최근 경력부터 정리하면 지원서에도 같은 순서로 채워집니다.</p></div><div className="mt-4 space-y-4">{value.map((career, index) => <article key={`${career.title}-${index}`} className="rounded-card border border-border bg-surface p-4"><div className="mb-3 flex items-center"><strong className="text-sm">경력 {index + 1}</strong><TextButton onClick={() => onChange(value.filter((_, candidate) => candidate !== index))} className="ml-auto px-3 text-fail hover:bg-fail-bg hover:text-fail">삭제</TextButton></div><div className="grid gap-3 sm:grid-cols-[100px_1fr_160px]"><label><span className="mb-1 block text-xs text-muted">연도</span><FieldInput type="number" value={career.year || ""} onChange={(event) => patch(index, { year: Number(event.target.value) })} /></label><label><span className="mb-1 block text-xs text-muted">작품명</span><FieldInput value={career.title} onChange={(event) => patch(index, { title: event.target.value })} /></label><label><span className="mb-1 block text-xs text-muted">배역</span><FieldInput value={career.part} onChange={(event) => patch(index, { part: event.target.value })} /></label></div></article>)}{value.length === 0 ? <div className="rounded-card border border-dashed border-border bg-surface px-5 py-8 text-center text-sm text-muted">저장한 경력이 없어요.</div> : null}{value.length < 10 ? <AddButton onClick={() => onChange([...value, { year: new Date().getFullYear(), title: "", part: "" }])} className="min-h-12 w-full">+ 경력 추가</AddButton> : <p className="text-sm text-muted">경력은 최대 10개까지 추가할 수 있어요.</p>}</div></section>;
}

function isCareer(value: unknown): value is CareerEntry { return typeof value === "object" && value !== null && "year" in value && "title" in value && "part" in value; }
function careerValue(value: ApplicantAnswerValue | undefined) { return Array.isArray(value) ? value.filter(isCareer) : []; }
function linkValue(value: ApplicantAnswerValue | undefined) { if (typeof value === "string") return value.trim() ? [value] : []; return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string").slice(0, MAX_PROFILE_LINKS) : []; }

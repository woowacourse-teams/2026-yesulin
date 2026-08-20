"use client";

import { useState } from "react";
import type { ChangeEvent } from "react";
import { updateApplicantApplication } from "@/features/applicants/api";
import { applicantRoutes } from "@/features/applicants/routes";
import type { ApplicantAnswerValue, ApplicantApplicationDetail, BodyMeasurements, CareerEntry } from "@/features/applicants/types";
import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import { AddButton, DestructiveButton, FieldInput, FieldSelect, FieldTextarea, PrimaryButton, SecondaryButton, TextButton } from "@/components/ui/controls";
import { useToast } from "@/components/auditions/toast";
import { CalendarDateRangeField } from "@/components/auditions/calendar-date-range-field";

type DraftValues = Record<string, ApplicantAnswerValue>;

export function ApplicationEditForm({ detail, onCancel, onSaved }: { readonly detail: ApplicantApplicationDetail; readonly onCancel: () => void; readonly onSaved: (detail: ApplicantApplicationDetail) => void }) {
  const toast = useToast();
  const initial = Object.fromEntries(detail.answers.map((answer) => [answer.key, answer.value])) as DraftValues;
  const [values, setValues] = useState<DraftValues>(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const enabledFields = detail.applicationFields.filter((field) => field.enabled).toSorted((a, b) => a.order - b.order);
  const changed = enabledFields.filter((field) => JSON.stringify(values[field.id]) !== JSON.stringify(initial[field.id]));

  const save = async () => {
    const invalid = enabledFields.find((field) => field.required && isEmpty(values[field.id]));
    if (invalid) {
      setError(`${invalid.label} 항목을 입력해 주세요.`);
      requestAnimationFrame(() => document.getElementById(`application-edit-${invalid.id}`)?.focus());
      return;
    }
    if (!changed.length) return;
    setSaving(true);
    setError("");
    try {
      const result = await updateApplicantApplication(detail.id, { answers: changed.map((field) => ({ key: field.id, value: values[field.id]! })) });
      toast("지원서 내용을 수정했어요.", { type: "success" });
      onSaved(result);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "지원서를 수정하지 못했습니다.");
    } finally {
      setSaving(false);
    }
  };

  return <div className="mx-auto max-w-[920px] px-5 py-8 md:px-8 md:py-10">
    <TextButton onClick={onCancel} disabled={saving} className="px-2 hover:bg-card hover:text-brand">← 상세로 돌아가기</TextButton>
    <header className="mt-4"><p className="text-sm font-semibold text-brand">지원서 수정</p><h1 className="mt-2 text-3xl font-bold tracking-[-0.03em]">{detail.performanceTitle}</h1><p className="mt-2 text-muted-strong">{detail.roleName} · {detail.editableUntil.slice(0, 10)} 23:59까지 수정 가능</p></header>
    <aside className="mt-6 rounded-card border border-warn/25 bg-warn-bg p-4 text-sm leading-6 text-muted-strong"><strong className="block text-warn">배역은 변경할 수 없어요.</strong>배역을 바꾸면 기획사/제작사의 심사 대상과 집계가 달라지기 때문에 현재 지원서에서는 답변만 수정할 수 있습니다.</aside>
    {error ? <p role="alert" className="mt-5 rounded-control border border-fail/25 bg-fail-bg px-4 py-3 text-sm font-medium text-fail">{error}</p> : null}
    <div className="mt-7 space-y-5">{enabledFields.map((field) => <EditableField key={field.id} field={field} value={values[field.id]} onChange={(value) => { setValues((current) => ({ ...current, [field.id]: value })); setError(""); }} />)}</div>
    <div className="glass-surface sticky bottom-4 mt-8 flex flex-wrap items-center gap-3 rounded-card border p-3"><p className="min-w-0 flex-1 px-2 text-sm text-muted-strong">{changed.length ? `${changed.length}개 항목이 변경됐어요.` : "변경된 내용이 없어요."}</p><SecondaryButton onClick={onCancel} disabled={saving}>취소</SecondaryButton><PrimaryButton onClick={save} disabled={saving || !changed.length} className="px-5">{saving ? "저장 중…" : "변경 내용 저장"}</PrimaryButton></div>
    <a href={applicantRoutes.applications} className="sr-only">지원서 목록</a>
  </div>;
}

function EditableField({ field, value, onChange }: { readonly field: ApplicationFieldInput; readonly value?: ApplicantAnswerValue; readonly onChange: (value: ApplicantAnswerValue) => void }) {
  const id = `application-edit-${field.id}`;
  if (field.id === "CAREER") return <CareerEditor id={id} field={field} value={Array.isArray(value) ? value.filter(isCareerEntry) : []} onChange={onChange} />;
  if (field.inputType === "COMPOSITE") return <CompositeEditor id={id} field={field} value={isBody(value) ? value : { height: 0, weight: 0 }} onChange={onChange} />;
  if (field.inputType === "FILE") return <FileEditor id={id} field={field} value={Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : []} onChange={onChange} />;
  const text = typeof value === "string" || typeof value === "number" ? String(value) : "";
  if (field.inputType === "DATE") return <fieldset className="rounded-card border border-border bg-card p-5"><legend className="px-1"><FieldTitle field={field} /></legend><CalendarDateRangeField single start={text} end="" startLabel={field.label} onStartChange={onChange} onEndChange={() => undefined} /></fieldset>;
  return <label className="block rounded-card border border-border bg-card p-5" htmlFor={id}><FieldTitle field={field} />{field.inputType === "TEXTAREA" ? <FieldTextarea id={id} value={text} rows={6} minLength={field.config.minLength} placeholder={field.config.placeholder} onChange={(event) => onChange(event.target.value)} /> : field.inputType === "SELECT" ? <FieldSelect id={id} value={text} onChange={(event) => onChange(event.target.value)}><option value="">선택해 주세요</option>{field.config.options?.map((option) => <option key={option}>{option}</option>)}</FieldSelect> : <FieldInput id={id} value={text} type={field.inputType === "TEL" ? "tel" : field.inputType === "URL" ? "url" : field.inputType === "NUMBER" ? "number" : "text"} placeholder={field.config.placeholder} onChange={(event) => onChange(field.inputType === "NUMBER" ? Number(event.target.value) : event.target.value)} />}</label>;
}

function CompositeEditor({ id, field, value, onChange }: { readonly id: string; readonly field: ApplicationFieldInput; readonly value: BodyMeasurements; readonly onChange: (value: ApplicantAnswerValue) => void }) {
  return <fieldset className="rounded-card border border-border bg-card p-5"><legend className="px-1"><FieldTitle field={field} /></legend><div className="grid gap-4 sm:grid-cols-2">{field.config.fields?.map((part) => <label key={part.key} htmlFor={`${id}-${part.key}`}><span className="mb-2 block text-sm font-medium">{part.label}</span><div className="relative"><FieldInput id={`${id}-${part.key}`} type="number" value={value[part.key as keyof BodyMeasurements]} onChange={(event) => onChange({ ...value, [part.key]: Number(event.target.value) })} className="pr-12" /><span className="absolute right-3 top-3 text-sm text-muted">{part.unit}</span></div></label>)}</div></fieldset>;
}

function CareerEditor({ id, field, value, onChange }: { readonly id: string; readonly field: ApplicationFieldInput; readonly value: readonly CareerEntry[]; readonly onChange: (value: ApplicantAnswerValue) => void }) {
  const patch = (index: number, update: Partial<CareerEntry>) => onChange(value.map((career, candidate) => candidate === index ? { ...career, ...update } : career));
  return <fieldset className="rounded-card border border-border bg-card p-5"><legend className="px-1"><FieldTitle field={field} /></legend><div className="space-y-4">{value.map((career, index) => <div key={`${career.title}-${index}`} className="grid gap-3 rounded-control bg-surface p-4 sm:grid-cols-[90px_1fr_140px_auto]"><FieldInput id={index === 0 ? id : undefined} type="number" aria-label={`경력 ${index + 1} 연도`} value={career.year} onChange={(event) => patch(index, { year: Number(event.target.value) })} /><FieldInput aria-label={`경력 ${index + 1} 작품명`} value={career.title} onChange={(event) => patch(index, { title: event.target.value })} /><FieldInput aria-label={`경력 ${index + 1} 배역`} value={career.part} onChange={(event) => patch(index, { part: event.target.value })} /><DestructiveButton onClick={() => onChange(value.filter((_, candidate) => candidate !== index))} className="px-3">삭제</DestructiveButton></div>)}<AddButton onClick={() => onChange([...value, { year: new Date().getFullYear(), title: "", part: "" }])} className="w-full">+ 경력 추가</AddButton></div></fieldset>;
}

function FileEditor({ id, field, value, onChange }: { readonly id: string; readonly field: ApplicationFieldInput; readonly value: readonly string[]; readonly onChange: (value: ApplicantAnswerValue) => void }) {
  const select = (event: ChangeEvent<HTMLInputElement>) => { const files = Array.from(event.target.files ?? []); if (files.length) onChange(files.map((file, index) => `mock-${Date.now()}-${index}-${file.name}`)); };
  return <label htmlFor={id} className="block rounded-card border border-border bg-card p-5"><FieldTitle field={field} /><input id={id} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={select} className="block min-h-12 w-full rounded-control border border-dashed border-border bg-surface px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-brand-soft file:px-3 file:py-2 file:font-semibold file:text-brand" /><p className="mt-2 text-sm text-muted">현재 {value.length}개 파일 · 새로 선택하면 전체 사진 구성이 교체됩니다.</p></label>;
}

function FieldTitle({ field }: { readonly field: ApplicationFieldInput }) { return <span className="mb-3 block text-sm font-semibold">{field.label}{field.required ? <span className="ml-1 text-fail">필수</span> : <span className="ml-1 font-normal text-muted">선택</span>}</span>; }
function isCareerEntry(value: unknown): value is CareerEntry { return typeof value === "object" && value !== null && "year" in value && "title" in value && "part" in value; }
function isBody(value: unknown): value is BodyMeasurements { return typeof value === "object" && value !== null && !Array.isArray(value) && "height" in value && "weight" in value; }
function isEmpty(value: ApplicantAnswerValue | undefined) { if (value === undefined) return true; if (typeof value === "string") return !value.trim(); if (Array.isArray(value)) return value.length === 0; return false; }

"use client";

import type { CareerDraft } from "@/features/applications/application-form-state";
import type { ApplicationFieldInput } from "@/features/auditions/creation-types";
import { careerDraftError } from "@/features/applications/application-form-state";
import { AddButton, fieldControlClass, TextButton } from "@/components/ui/controls";
import { usePublicApplication } from "./public-application-context";

const MAX_CAREER_COUNT = 10;

export function PublicApplicationCareer({ field }: { field: ApplicationFieldInput }) {
  const { state, actions } = usePublicApplication();
  const errorId = `application-${field.id}-error`;
  const fieldError = state.fieldErrors[field.id] ?? "";
  // 카드 하나가 잘못된 경우의 오류는 CAREER-<카드 id>로 저장된다. 비어 있음 오류와 키가 달라 따로 찾는다.
  const hasDraftError = Object.keys(state.fieldErrors).some((key) => key.startsWith(`${field.id}-`));
  const emptyError = fieldError && !state.noCareer && state.careers.length === 0 ? fieldError : "";
  const addCareer = () => actions.updateCareers([...state.careers, { id: crypto.randomUUID(), title: "", part: "", year: "" }]);
  const patchCareer = (id: string, update: Partial<CareerDraft>) => actions.updateCareers(state.careers.map((career) => career.id === id ? { ...career, ...update } : career));

  return <section id={`application-field-${field.id}`}><label className="flex cursor-pointer items-start gap-3 rounded-card border border-border bg-surface p-4"><input type="checkbox" checked={state.noCareer} onChange={(event) => actions.updateNoCareer(event.target.checked)} aria-invalid={Boolean(emptyError) || undefined} aria-describedby={emptyError ? errorId : undefined} className="mt-1 h-4 w-4 shrink-0 accent-brand" /><span><strong className="block text-sm">아직 공연 경력이 없습니다</strong><span className="mt-1 block text-sm leading-6 text-muted">경력이 없어도 지원할 수 있어요. 자기소개에서 준비 과정을 알려 주세요.</span></span></label>{state.noCareer ? <p className="mt-4 rounded-control border border-brand-line bg-brand-soft px-4 py-3 text-sm text-brand">경력 입력을 건너뛰었어요.</p> : <div className="mt-5 space-y-4">{state.careers.length === 0 ? <p className="rounded-control border border-dashed border-border bg-surface px-4 py-3 text-sm leading-6 text-muted">등록한 경력이 없어요. 경력이 있다면 아래에서 추가해 주세요.</p> : null}{state.careers.map((career, index) => <CareerCard key={career.id} career={career} index={index} fieldId={field.id} required={field.required} showErrors={Boolean(fieldError) || hasDraftError} onChange={(update) => patchCareer(career.id, update)} onRemove={() => actions.updateCareers(state.careers.filter((item) => item.id !== career.id))} />)}{state.careers.length < MAX_CAREER_COUNT ? <AddButton onClick={addCareer} className="min-h-12 w-full">+ 경력 추가</AddButton> : <p className="text-sm text-muted">경력은 최대 {MAX_CAREER_COUNT}개까지 추가할 수 있어요.</p>}</div>}{emptyError ? <p id={errorId} role="alert" className="mt-3 text-sm font-medium leading-6 text-fail">{emptyError}</p> : null}</section>;
}

function CareerCard({ career, index, fieldId, required, showErrors, onChange, onRemove }: { career: CareerDraft; index: number; fieldId: string; required: boolean; showErrors: boolean; onChange: (update: Partial<CareerDraft>) => void; onRemove: () => void }) {
  const error = showErrors ? careerDraftError(career) : null;
  const cardId = `application-field-${fieldId}-${career.id}`;
  const errorId = `application-${fieldId}-${career.id}-error`;
  const describedBy = error ? errorId : undefined;
  const title = career.title || `경력 ${index + 1}`;
  return <article id={cardId} className={`rounded-card border bg-card p-4 ${error ? "border-fail/40" : "border-border"}`}><div className="mb-4 flex items-center"><strong className="text-sm text-muted-strong">경력 {index + 1}</strong><TextButton onClick={onRemove} aria-label={`${title} 삭제`} className="ml-auto px-3 text-muted hover:bg-fail-bg hover:text-fail">삭제</TextButton></div><label htmlFor={`${fieldId}-${career.id}-title`} className="block"><span className="mb-2 flex text-sm font-semibold">작품명{required ? <span className="text-fail" aria-label="필수">*</span> : null}</span><input id={`${fieldId}-${career.id}-title`} value={career.title} aria-invalid={Boolean(error) || undefined} aria-describedby={describedBy} onChange={(event) => onChange({ title: event.target.value })} placeholder="예: 뮤지컬 <빨래>" className={error ? `${fieldControlClass} border-fail focus:border-fail focus:ring-fail-bg` : fieldControlClass} /></label><div className="mt-4 grid gap-4 md:grid-cols-2"><label htmlFor={`${fieldId}-${career.id}-part`}><span className="mb-2 flex text-sm font-semibold">맡은 배역{required ? <span className="text-fail" aria-label="필수">*</span> : null}</span><input id={`${fieldId}-${career.id}-part`} value={career.part} aria-invalid={Boolean(error) || undefined} aria-describedby={describedBy} onChange={(event) => onChange({ part: event.target.value })} placeholder="앙상블 / 조연 / 주연" className={error ? `${fieldControlClass} border-fail focus:border-fail focus:ring-fail-bg` : fieldControlClass} /></label><label htmlFor={`${fieldId}-${career.id}-year`}><span className="mb-2 flex text-sm font-semibold">연도{required ? <span className="text-fail" aria-label="필수">*</span> : null}</span><input id={`${fieldId}-${career.id}-year`} type="number" min="1900" max="2100" value={career.year} aria-invalid={Boolean(error) || undefined} aria-describedby={describedBy} onChange={(event) => onChange({ year: event.target.value })} placeholder="2024" className={error ? `${fieldControlClass} num border-fail focus:border-fail focus:ring-fail-bg` : `${fieldControlClass} num`} /></label></div>{error ? <p id={errorId} role="alert" className="mt-3 text-sm font-medium leading-6 text-fail">경력 {index + 1} · {error}</p> : null}</article>;
}
